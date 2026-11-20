"""Run as `python -m app.worker publisher|notifications`."""
import json
import logging
import sys
import time
from datetime import datetime, timezone
from uuid import UUID

import pika
from sqlalchemy import select

from app.core.config import settings
from app.database.connection import SessionLocal
from app.models import Notification
from app.models.entities import OutboxEvent, ProcessedEvent

log = logging.getLogger(__name__)
QUEUE = "smartdelivery.notifications.v1"


def connect():
    params = pika.URLParameters(settings.rabbitmq_url)
    params.heartbeat = 60
    params.blocked_connection_timeout = 15
    params.socket_timeout = 10
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.exchange_declare(exchange="smartdelivery.dead", exchange_type="fanout", durable=True)
    channel.queue_declare(queue=QUEUE + ".dead", durable=True)
    channel.queue_bind(queue=QUEUE + ".dead", exchange="smartdelivery.dead")
    channel.queue_declare(queue=QUEUE, durable=True, arguments={
        "x-dead-letter-exchange": "smartdelivery.dead",
    })
    channel.confirm_delivery()
    return connection, channel


def publish_batch(channel):
    # Lock rows until broker confirmation. Concurrent publishers skip claimed rows.
    with SessionLocal.begin() as db:
        events = db.scalars(select(OutboxEvent).where(OutboxEvent.published_at.is_(None))
                            .order_by(OutboxEvent.created_at).limit(50)
                            .with_for_update(skip_locked=True)).all()
        for event in events:
            channel.basic_publish(exchange="", routing_key=QUEUE, body=event.payload,
                                  mandatory=True, properties=pika.BasicProperties(
                                      delivery_mode=2, content_type="application/json", message_id=str(event.id)))
            event.published_at = datetime.now(timezone.utc)


def process_event(event_id, payload):
    event_id = UUID(event_id)
    if payload.get("version") != 1 or payload.get("type") != "notification.requested":
        raise ValueError("Unsupported event contract")
    user_id = UUID(payload["user_id"])
    delivery_id = UUID(payload["delivery_id"]) if payload.get("delivery_id") else None
    if not isinstance(payload["kind"], str) or not 0 < len(payload["kind"]) <= 40:
        raise ValueError("Invalid notification kind")
    if not isinstance(payload["message"], str) or not 0 < len(payload["message"]) <= 500:
        raise ValueError("Invalid notification message")
    with SessionLocal.begin() as db:
        # Conflict-safe insert serializes duplicate deliveries across consumers.
        from sqlalchemy.dialects.postgresql import insert
        claimed = db.execute(insert(ProcessedEvent).values(id=event_id)
                             .on_conflict_do_nothing().returning(ProcessedEvent.id)).scalar_one_or_none()
        if claimed is not None:
            db.add(Notification(user_id=user_id, delivery_id=delivery_id,
                                kind=payload["kind"], message=payload["message"]))


def consume(channel, method, properties, body):
    try:
        process_event(properties.message_id, json.loads(body))
    except (ValueError, KeyError, TypeError, AttributeError):
        log.exception("Invalid event; routing to dead-letter queue")
        channel.basic_nack(method.delivery_tag, requeue=False)
    else:
        # Database errors escape: reconnect with backoff and broker redelivery.
        channel.basic_ack(method.delivery_tag)


def run(mode):
    delay = 1
    while True:
        connection = None
        try:
            connection, channel = connect()
            if mode == "publisher":
                while True:
                    publish_batch(channel)
                    connection.sleep(settings.event_poll_seconds)
            else:
                channel.basic_qos(prefetch_count=1)
                channel.basic_consume(queue=QUEUE, on_message_callback=consume, auto_ack=False)
                channel.start_consuming()
        except KeyboardInterrupt:
            return
        except Exception:
            log.exception("Worker disconnected; retrying in %s seconds", delay)
            time.sleep(delay)
            delay = min(delay * 2, 30)
        finally:
            if connection is not None and connection.is_open:
                connection.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    if len(sys.argv) != 2 or sys.argv[1] not in {"publisher", "notifications"}:
        raise SystemExit("Usage: python -m app.worker publisher|notifications")
    run(sys.argv[1])
