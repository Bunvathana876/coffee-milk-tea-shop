from pydantic import BaseModel

class HealthCheckResponse(BaseModel):
    status: str
    message: str
    app: str
    version: str
    environment: str

