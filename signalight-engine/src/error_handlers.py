"""Error Handling - 에러 처리 및 응답 포맷팅"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)


def setup_error_handlers(app: FastAPI):
    """FastAPI 에러 핸들러 설정"""

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """입력 검증 에러 핸들러"""
        errors = []
        for error in exc.errors():
            field = ".".join(str(x) for x in error["loc"][1:])
            message = error["msg"]
            errors.append({"field": field, "message": message})

        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "입력 검증 실패",
                "details": errors,
            },
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        """값 에러 핸들러"""
        logger.error(f"ValueError: {str(exc)}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "입력 값 에러",
                "detail": str(exc),
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 에러 핸들러"""
        logger.error(f"Unhandled exception: {type(exc).__name__}: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "서버 오류",
                "detail": "예상치 못한 오류가 발생했습니다",
            },
        )


class APIResponse:
    """표준화된 API 응답"""

    @staticmethod
    def success(data=None, message="성공"):
        return {
            "success": True,
            "message": message,
            "data": data,
        }

    @staticmethod
    def error(detail="오류 발생", status_code=400, errors=None):
        return {
            "success": False,
            "error": detail,
            "errors": errors or [],
            "status_code": status_code,
        }

    @staticmethod
    def validation_error(field: str, message: str):
        return {
            "success": False,
            "error": "입력 검증 실패",
            "errors": [{"field": field, "message": message}],
        }

    @staticmethod
    def not_found(resource: str):
        return {
            "success": False,
            "error": f"{resource}을(를) 찾을 수 없습니다",
            "status_code": 404,
        }

    @staticmethod
    def unauthorized():
        return {
            "success": False,
            "error": "인증이 필요합니다",
            "status_code": 401,
        }

    @staticmethod
    def forbidden():
        return {
            "success": False,
            "error": "접근 권한이 없습니다",
            "status_code": 403,
        }
