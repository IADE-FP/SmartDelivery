from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import uuid

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user_id: uuid.UUID, role: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user_id), "role": role, "type": "access", "iat": now,
                       "exp": now + timedelta(minutes=settings.access_token_minutes)},
                      settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def new_refresh_token() -> tuple[str, str, datetime]:
    raw = secrets.token_urlsafe(48)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)
    return raw, digest, expires


def digest_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def create_password_reset_token() -> tuple[str, str, datetime]:
    raw = secrets.token_urlsafe(32)
    return raw, digest_token(raw), datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_minutes)
