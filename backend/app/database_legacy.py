import os
import psycopg
from psycopg.rows import dict_row


DATABASE_URL = os.getenv("DATABASE_URL")


def obter_ligacao():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL não está configurada.")

    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row,
    )


def criar_tabela():
    with obter_ligacao() as ligacao:
        ligacao.execute("""
            CREATE TABLE IF NOT EXISTS acoes (
                id BIGSERIAL PRIMARY KEY,
                descricao TEXT NOT NULL,
                servidor VARCHAR(50) NOT NULL,
                criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)


def guardar_acao(descricao: str, servidor: str):
    with obter_ligacao() as ligacao:
        resultado = ligacao.execute("""
            INSERT INTO acoes (descricao, servidor)
            VALUES (%s, %s)
            RETURNING id, descricao, servidor, criado_em;
        """, (descricao, servidor))

        return resultado.fetchone()


def listar_acoes():
    with obter_ligacao() as ligacao:
        resultado = ligacao.execute("""
            SELECT id, descricao, servidor, criado_em
            FROM acoes
            ORDER BY id;
        """)

        return resultado.fetchall()