"""Canonical response envelope for InvestIQ FastAPI services.

Guarantees every JSON response follows ``{ "message": ..., "data": ... }`` — the same
contract the Spring services and the frontend expect. ``install_envelope(app)`` registers:

* a middleware that wraps successful raw JSON bodies as ``{"message": "Success", "data": ...}``
* exception handlers that emit ``{"message": <reason>, "data": null}`` (or field errors for
  validation failures) with the appropriate HTTP status.

Already-enveloped bodies (those whose only keys are ``message``/``data``) pass through untouched,
and Swagger/OpenAPI/health endpoints are never rewrapped.
"""
import json

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

_SKIP_PREFIXES = ("/docs", "/redoc", "/openapi", "/favicon")


def _is_enveloped(payload: object) -> bool:
    return isinstance(payload, dict) and "data" in payload and set(payload.keys()) <= {"message", "data"}


class EnvelopeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if any(request.url.path.startswith(p) for p in _SKIP_PREFIXES):
            return response
        if "application/json" not in response.headers.get("content-type", ""):
            return response

        body = b"".join([chunk async for chunk in response.body_iterator])
        try:
            payload = json.loads(body) if body else None
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(content=body, status_code=response.status_code,
                            media_type=response.headers.get("content-type"))

        if _is_enveloped(payload):
            wrapped = payload
        elif response.status_code >= 400:
            message = "Something went wrong"
            if isinstance(payload, dict):
                message = payload.get("message") or payload.get("detail") or message
            wrapped = {"message": message, "data": None}
        else:
            wrapped = {"message": "Success", "data": payload}

        return JSONResponse(content=wrapped, status_code=response.status_code)


def install_envelope(app: FastAPI) -> None:
    app.add_middleware(EnvelopeMiddleware)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(status_code=exc.status_code, content={"message": detail, "data": None})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        errors = {".".join(str(p) for p in e["loc"][1:]) or "body": e["msg"] for e in exc.errors()}
        return JSONResponse(status_code=422, content={"message": "Validation failed", "data": errors})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, _exc: Exception):
        return JSONResponse(status_code=500, content={"message": "Something went wrong", "data": None})
