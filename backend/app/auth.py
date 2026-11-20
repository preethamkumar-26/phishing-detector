import os
from typing import Optional, Any
from pydantic import BaseModel
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client, ClientOptions
from supabase_auth.errors import AuthApiError, AuthError

from app.core.config import settings
from app.core.logging import logger

security_scheme = HTTPBearer(auto_error=False)

# Reusable base client for public verification
_base_client: Optional[Client] = None

def get_base_client() -> Client:
    global _base_client
    if _base_client is None:
        _base_client = create_client(
            settings.SUPABASE_URL,
            settings.resolved_supabase_key,
        )
    return _base_client


class AuthenticatedUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: Optional[str] = None
    token: str
    raw_user: Optional[Any] = None


def get_user_supabase_client(token: str) -> Client:
    """
    Create a request-scoped Supabase client forwarding the user's JWT.
    Ensures Postgres Row Level Security (RLS) evaluates auth.uid() as this user.
    Does NOT mutate any shared global client headers.
    """
    opts = ClientOptions(headers={"Authorization": f"Bearer {token}"})
    return create_client(
        settings.SUPABASE_URL,
        settings.resolved_supabase_key,
        options=opts,
    )


def verify_supabase_token(token: str) -> AuthenticatedUser:
    """
    Validates the bearer token against Supabase Auth.
    Rejects missing, malformed, expired, or invalid tokens with HTTP 401.
    Never accepts client-supplied user_id.
    """
    if not token or not isinstance(token, str) or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing or empty.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    clean_token = token.strip()
    client = get_base_client()

    try:
        user_response = client.auth.get_user(clean_token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = user_response.user
        user_id = str(user.id)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to determine verified user identity from token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return AuthenticatedUser(
            id=user_id,
            email=user.email,
            role=user.role,
            token=clean_token,
            raw_user=user,
        )
    except (AuthApiError, AuthError) as auth_err:
        logger.warning(f"Supabase Auth verification failed: {auth_err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {auth_err.message if hasattr(auth_err, 'message') else str(auth_err)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Unexpected error verifying token: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Token verification could not be completed.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency to extract and authenticate Bearer token.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer token in the Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_supabase_token(credentials.credentials)
