from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.db.database import engine, Base
from app.api.routes import health, market_data, forecast, model, evaluation, predictions, compat_v1


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info(f"{settings.PROJECT_NAME} v{settings.VERSION} ready.")
    yield
    # Shutdown
    logger.info("Shutting down API server...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FastAPI Backend for Stock Trend Forecaster using PyTorch LSTM",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health.router, prefix="/api")
app.include_router(market_data.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(model.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(compat_v1.router, prefix="/api")


@app.get("/")
def root_redirect():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docsUrl": "/api/docs",
        "healthUrl": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
