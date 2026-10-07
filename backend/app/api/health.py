from fastapi import APIRouter
from app.core.config import settings
from app.schemas.health import HealthCheckResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthCheckResponse)
def health_check() -> HealthCheckResponse:
    """Simple health-check endpoint to confirm backend availability."""
    return HealthCheckResponse(
        status="healthy",
        message="Coffee & Milk Tea Shop API is up and running",
        app=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )

