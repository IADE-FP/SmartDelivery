
import os
import pika


def processar_mensagem(ch, metodo, propriedades, corpo):
    mensagem = corpo.decode("utf-8")
    print(f"Mensagem recebida: {mensagem}")
    ch.basic_ack(delivery_tag=metodo.delivery_tag)


def iniciar_consumidor():
    url = os.getenv("RABBITMQ_URL")

    if not url:
        raise ValueError("RABBITMQ_URL nao esta configurada.")

    parametros = pika.URLParameters(url)

    ligacao = pika.BlockingConnection(parametros)
    canal = ligacao.channel()

    canal.queue_declare(
        queue="smartdelivery.entregas",
        durable=True,
    )

    canal.basic_qos(prefetch_count=1)

    canal.basic_consume(
        queue="smartdelivery.entregas",
        on_message_callback=processar_mensagem,
    )

    print("Consumidor iniciado. A aguardar mensagens...")
    canal.start_consuming()


if __name__ == "__main__":
    iniciar_consumidor()
