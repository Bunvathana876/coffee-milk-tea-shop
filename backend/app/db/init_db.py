import logging
from sqlalchemy.orm import Session
from app.db.session import Base, engine, SessionLocal
from app.db.seed_data import seed_database
# Ensure all models are loaded
import app.models  # noqa: F401

logger = logging.getLogger(__name__)

def create_tables() -> None:
    """Create all database tables defined in SQLAlchemy models."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created successfully.")

def init_db() -> None:
    """Initialize database: create tables and seed starter data if needed."""
    create_tables()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
