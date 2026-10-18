from fastapi import FastAPI

app = FastAPI(
    title="SmartDelivery API",
    description="Sistema Distribuído de Gestão Inteligente de Entregas",
    version="0.1.0",
)


@app.get("/")
def inicio():
    return {
        "mensagem": "Bem-vindo ao SmartDelivery!",
        "estado": "ativo",
    }


@app.get("/health")
def verificar_estado():
    return {"estado": "saudavel"}