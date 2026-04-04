"""Authentication module with JWT token management."""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import hmac

from fastapi import HTTPException, status
from . import store

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return hash_password(plain_password) == hashed_password


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token (simplified without PyJWT for now)."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.utcnow() + expires_delta

    # Create a simple token format: user_id.timestamp.signature
    token_data = f"{user_id}.{int(expire.timestamp())}"
    signature = hmac.new(
        SECRET_KEY.encode(),
        token_data.encode(),
        hashlib.sha256,
    ).hexdigest()

    token = f"{token_data}.{signature}"
    return token


def verify_access_token(token: str) -> Optional[str]:
    """Verify a JWT token and return user_id if valid."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        user_id, expire_ts, signature = parts
        expire = int(expire_ts)

        # Verify signature
        token_data = f"{user_id}.{expire_ts}"
        expected_signature = hmac.new(
            SECRET_KEY.encode(),
            token_data.encode(),
            hashlib.sha256,
        ).hexdigest()

        if signature != expected_signature:
            return None

        # Check expiration
        if datetime.utcnow().timestamp() > expire:
            return None

        return user_id
    except Exception:
        return None


def register_user(email: str, password: str, display_name: str = "") -> dict:
    """Register a new user with email and password."""
    # Check if email already exists
    existing = store.get_user_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user_id = str(uuid.uuid4())
    password_hash = hash_password(password)

    user = store.create_user(
        user_id=user_id,
        email=email,
        display_name=display_name or email.split("@")[0],
        auth_method="password",
        password_hash=password_hash,
    )

    # Create token
    token = create_access_token(user_id)

    return {
        "user_id": user_id,
        "email": user["email"],
        "display_name": user["display_name"],
        "auth_method": "password",
        "token": token,
    }


def login_user(email: str, password: str) -> dict:
    """Login a user with email and password."""
    user = store.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Create token
    token = create_access_token(user["id"])

    return {
        "user_id": user["id"],
        "email": user["email"],
        "display_name": user["display_name"],
        "auth_method": "password",
        "token": token,
    }


def create_guest_user() -> dict:
    """Create a guest user (no database storage, UUID-based)."""
    user_id = str(uuid.uuid4())

    # Create user in database
    user = store.create_user(
        user_id=user_id,
        display_name="Guest",
        auth_method="guest",
    )

    # Create token
    token = create_access_token(user_id)

    return {
        "user_id": user_id,
        "display_name": "Guest",
        "auth_method": "guest",
        "token": token,
    }


def google_login(google_token: str) -> dict:
    """Login/register via Google OAuth (simplified - in production use google-auth library)."""
    # In production, verify the Google token here using google-auth
    # For now, we'll create a user based on the token
    user_id = str(uuid.uuid4())
    email = f"google_{user_id}@example.com"  # Placeholder - would get from Google

    # Check if user exists (by some Google identifier)
    user = store.get_user_by_email(email)
    if not user:
        user = store.create_user(
            user_id=user_id,
            email=email,
            display_name="Google User",
            auth_method="google",
        )

    # Create token
    token = create_access_token(user["id"])

    return {
        "user_id": user["id"],
        "email": user.get("email"),
        "display_name": user["display_name"],
        "auth_method": "google",
        "token": token,
    }
