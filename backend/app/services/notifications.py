"""Notification commands are committed atomically with the business operation."""
import json

from app.core.config import settings
from app.models import Notification
from app.models.entities import OutboxEvent


def add_notice(db, user_id, delivery_id, kind, message):
    if settings.async_notifications:
        db.add(OutboxEvent(payload=json.dumps({
            "version": 1, "type": "notification.requested",
            "user_id": str(user_id), "delivery_id": str(delivery_id) if delivery_id else None,
            "kind": kind, "message": message,
        })))
    else:
        db.add(Notification(user_id=user_id, delivery_id=delivery_id, kind=kind, message=message))
