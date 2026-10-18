# SmartDelivery

**Sistema Distribuído de Gestão Inteligente de Entregas**

Projeto académico — Ano letivo 2026/2027.

## Sobre o projeto

O SmartDelivery pretende desenvolver um sistema distribuído para gerir entregas de forma inteligente, explorando a comunicação entre serviços, a gestão de dados e a otimização de rotas.

## Tecnologias utilizadas

- **Python e FastAPI:** desenvolvimento da API.
- **PostgreSQL:** armazenamento de dados.
- **RabbitMQ:** comunicação assíncrona entre serviços.
- **Docker e Docker Compose:** execução dos serviços em contentores.
- **React:** tecnologia prevista para a interface web.

## Estrutura do projeto

```text
SmartDelivery/
├── backend/
│   ├── app/
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── database/
│   └── init/
├── docs/
├── frontend/
├── compose.yaml
└── README.md
```

## Pré-requisitos

- Docker Desktop instalado e em execução.
- Git instalado.

## Como executar

1. Clonar o repositório:

   `git clone https://github.com/IADE-FP/SmartDelivery.git`

2. Entrar na pasta:

   `cd SmartDelivery`

3. Criar um ficheiro `.env` local com as variáveis `POSTGRES_PASSWORD`, `DATABASE_URL` e `RABBITMQ_URL`. Não publicar esse ficheiro no GitHub.

4. Iniciar os serviços:

   `docker compose up --build`

## Acessos locais

- API: http://localhost:8000
- Documentação da API: http://localhost:8000/docs
- RabbitMQ Management: http://localhost:15672

## Estado atual

- API FastAPI funcional.
- PostgreSQL configurado em Docker.
- RabbitMQ configurado em Docker.
- Serviços iniciados e testados localmente.

A comunicação efetiva entre o backend, a base de dados e o RabbitMQ será desenvolvida e testada nas próximas etapas.

## Equipa

Projeto desenvolvido no âmbito da unidade curricular de Sistemas Distribuídos.

Os membros da equipa serão identificados nesta secção.
