from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.errors import register_error_handlers
from app.core.rate_limit import RateLimitMiddleware
from app.routers import (
    analytics,
    applications,
    assistant,
    auth,
    cv,
    extension,
    files,
    founders,
    jobs,
    jobs_status,
    match,
    notifications,
    outreach,
    resumes,
    startups,
)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="0.1.0")

    # The web app (Vite dev server / prod web origin) calls the API cross-origin,
    # so CORS must be explicit. Origins come from CORS_ORIGINS in .env; the
    # extension is exempt (host_permissions bypass CORS in MV3).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware, limit=100, window_seconds=60)
    register_error_handlers(app)

    # Versioned API surface per API_SPEC.md (base URL: /v1).
    api = APIRouter(prefix="/v1")
    api.include_router(auth.router)
    api.include_router(startups.router)
    api.include_router(jobs.router)
    api.include_router(founders.router)
    api.include_router(cv.router)
    api.include_router(match.router)
    api.include_router(resumes.router)
    api.include_router(resumes.versions_router)
    api.include_router(outreach.router)
    api.include_router(applications.router)
    api.include_router(analytics.router)
    api.include_router(extension.router)
    api.include_router(assistant.router)
    api.include_router(jobs_status.router)
    api.include_router(notifications.router)
    api.include_router(files.router)
    app.include_router(api)

    @app.get("/healthz", tags=["health"])
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()


def run() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
