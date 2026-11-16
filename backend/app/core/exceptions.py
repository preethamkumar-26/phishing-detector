from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.logging import logger

HTTP_422_STATUS = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)


class ModelNotReadyError(Exception):
    def __init__(self, message: str = "Machine learning model is not initialized."):
        self.message = message
        super().__init__(self.message)


class InferenceExecutionError(Exception):
    def __init__(self, message: str = "Failed to execute phishing inference."):
        self.message = message
        super().__init__(self.message)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ModelNotReadyError)
    async def model_not_ready_handler(request: Request, exc: ModelNotReadyError):
        logger.error(f"ModelNotReadyError on {request.url.path}: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "error": "ModelNotReadyError",
                "detail": exc.message,
            },
        )

    @app.exception_handler(InferenceExecutionError)
    async def inference_error_handler(request: Request, exc: InferenceExecutionError):
        logger.error(f"InferenceExecutionError on {request.url.path}: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "InferenceExecutionError",
                "detail": exc.message,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
        return JSONResponse(
            status_code=HTTP_422_STATUS,
            content={
                "success": False,
                "error": "ValidationError",
                "detail": "Invalid request payload. Ensure email content/body is provided.",
                "validation_errors": jsonable_encoder(exc.errors()),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled exception on {request.url.path}: {str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "InternalServerError",
                "detail": "An unexpected server error occurred during email analysis.",
            },
        )