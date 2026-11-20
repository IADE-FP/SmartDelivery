import os
import pika


def enviar_mensagem(mensagem: str) -> None:
    url = os.getenv("RABBITMQ_URL")

    if not url:
        raise ValueError("RABBITMQ_URL não está configurada.")

    parametros = pika.URLParameters(url)

    with pika.BlockingConnection(parametros) as ligacao:
        canal = ligacao.channel()

        canal.queue_declare(
            queue="smartdelivery.entregas",
            durable=True,
        )

        canal.basic_publish(
            exchange="",
            routing_key="smartdelivery.entregas",
            body=mensagem.encode("utf-8"),
            properties=pika.BasicProperties(
                delivery_mode=2,
            ),
        )