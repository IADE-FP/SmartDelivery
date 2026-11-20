import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.dependencies import get_db
from app.core.security import hash_password
from app.database import criar_tabela, guardar_acao, listar_acoes
from app.database.connection import engine, SessionLocal
from app.models import Base, User
from app.models.entities import Role
from app.routes.api import router
from app.rabbitmq_client import enviar_mensagem

SERVIDOR = os.getenv("SERVER_ID", "backend-nao-identificado")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    criar_tabela()

    if settings.admin_email and settings.admin_password:
        with SessionLocal() as db:
            existing = db.scalar(
                select(User).where(User.email == settings.admin_email.lower())
            )
            if existing is None:
                db.add(User(
                    email=settings.admin_email.lower(),
                    password_hash=hash_password(settings.admin_password),
                    role=Role.ADMIN,
                ))
                db.commit()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="SmartDelivery - Plataforma de gestão inteligente de entregas",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.api_v1_prefix)


@app.get("/")
def inicio():
    return {
        "name": settings.app_name,
        "mensagem": "Bem-vindo ao SmartDelivery!",
        "status": "ok",
        "servidor": SERVIDOR,
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"estado": "saudavel", "servidor": SERVIDOR}


@app.get("/ready")
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "servidor": SERVIDOR}
    except SQLAlchemyError as erro:
        raise HTTPException(status_code=503, detail="Database unavailable") from erro


class MensagemEntrada(BaseModel):
    mensagem: str


class AcaoEntrada(BaseModel):
    descricao: str


@app.post("/acoes")
def registar_acao(dados: AcaoEntrada):
    if not dados.descricao.strip():
        raise HTTPException(status_code=400, detail="A descricao nao pode estar vazia.")
    try:
        acao = guardar_acao(dados.descricao, SERVIDOR)
        return {"estado": "registado", "acao": acao, "servidor": SERVIDOR}
    except Exception as erro:
        raise HTTPException(status_code=503, detail="Erro ao guardar acao.") from erro


@app.get("/acoes")
def consultar_acoes():
    try:
        return {"acoes": listar_acoes(), "servidor": SERVIDOR}
    except Exception as erro:
        raise HTTPException(status_code=503, detail="Erro ao consultar acoes.") from erro


@app.post("/mensagens")
def publicar_mensagem(dados: MensagemEntrada):
    if not dados.mensagem.strip():
        raise HTTPException(status_code=400, detail="A mensagem nao pode estar vazia.")
    try:
        enviar_mensagem(dados.mensagem)
        return {"estado": "enviado", "mensagem": dados.mensagem}
    except Exception as erro:
        raise HTTPException(status_code=503, detail="Erro ao enviar mensagem.") from erro
