from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.categories import router as categories_router
from app.api.products import router as products_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(categories_router)
api_router.include_router(products_router)
