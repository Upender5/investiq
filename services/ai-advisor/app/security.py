from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import Settings, get_settings

bearer = HTTPBearer()

DISCLAIMER = (
    "This is AI-generated educational content and not professional financial advice. "
    "Investments are subject to market risks. Past performance does not guarantee future returns. "
    "Please consult a SEBI-registered investment advisor before making financial decisions. "
    "Ensure KYC compliance before investing."
)


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
