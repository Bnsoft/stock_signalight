"""Dashboard Routes - 대시보드 레이아웃 API 라우트"""

from fastapi import APIRouter, Query
import json
from datetime import datetime

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/layouts/{user_id}")
async def get_layouts(user_id: str):
    """사용자의 모든 대시보드 레이아웃 조회"""
    try:
        from . import store

        with store._connect() as conn:
            layouts = conn.execute(
                """SELECT layout_id, layout_name, widgets, created_at, updated_at, is_default
                   FROM dashboard_layouts
                   WHERE user_id = ?
                   ORDER BY updated_at DESC""",
                (user_id,),
            ).fetchall()

        return {
            "layouts": [
                {
                    "id": l[0],
                    "name": l[1],
                    "widgets": json.loads(l[2]),
                    "createdAt": l[3],
                    "updatedAt": l[4],
                    "isDefault": bool(l[5]),
                }
                for l in layouts
            ]
        }
    except Exception as e:
        return {"layouts": [], "error": str(e)}


@router.post("/layouts/{user_id}")
async def create_or_update_layout(user_id: str, data: dict):
    """대시보드 레이아웃 저장"""
    try:
        from . import store

        layout_id = data.get("id", f"layout-{int(datetime.utcnow().timestamp())}")
        layout_name = data.get("name", "새 레이아웃")
        widgets = data.get("widgets", [])
        is_default = data.get("isDefault", False)

        with store._connect() as conn:
            # 기존 레이아웃 확인
            existing = conn.execute(
                """SELECT layout_id FROM dashboard_layouts
                   WHERE user_id = ? AND layout_id = ?""",
                (user_id, layout_id),
            ).fetchone()

            if existing:
                # 업데이트
                conn.execute(
                    """UPDATE dashboard_layouts
                       SET layout_name = ?, widgets = ?, is_default = ?, updated_at = datetime('now')
                       WHERE user_id = ? AND layout_id = ?""",
                    (layout_name, json.dumps(widgets), int(is_default), user_id, layout_id),
                )
            else:
                # 생성
                conn.execute(
                    """INSERT INTO dashboard_layouts
                       (user_id, layout_id, layout_name, widgets, is_default, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))""",
                    (user_id, layout_id, layout_name, json.dumps(widgets), int(is_default)),
                )

            conn.commit()

        return {
            "success": True,
            "layoutId": layout_id,
            "message": "레이아웃이 저장되었습니다",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.delete("/layouts/{user_id}/{layout_id}")
async def delete_layout(user_id: str, layout_id: str):
    """대시보드 레이아웃 삭제"""
    try:
        from . import store

        with store._connect() as conn:
            conn.execute(
                """DELETE FROM dashboard_layouts
                   WHERE user_id = ? AND layout_id = ?""",
                (user_id, layout_id),
            )
            conn.commit()

        return {
            "success": True,
            "message": "레이아웃이 삭제되었습니다",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/widgets")
async def get_available_widgets():
    """사용 가능한 모든 위젯 목록"""
    return {
        "widgets": [
            {
                "id": "portfolio-summary",
                "name": "포트폴리오 요약",
                "description": "현재 포트폴리오 가치 및 성과",
                "defaultSize": "large",
                "icon": "💼",
            },
            {
                "id": "market-stats",
                "name": "시장 통계",
                "description": "상승/하락 종목, 시장 폭",
                "defaultSize": "medium",
                "icon": "📊",
            },
            {
                "id": "recent-alerts",
                "name": "최근 알람",
                "description": "최근 발동된 알람 목록",
                "defaultSize": "medium",
                "icon": "🔔",
            },
            {
                "id": "top-gainers",
                "name": "상승 종목",
                "description": "상위 상승 종목",
                "defaultSize": "small",
                "icon": "📈",
            },
            {
                "id": "top-losers",
                "name": "하락 종목",
                "description": "상위 하락 종목",
                "defaultSize": "small",
                "icon": "📉",
            },
            {
                "id": "watchlist",
                "name": "관심 종목",
                "description": "저장된 관심 종목 목록",
                "defaultSize": "large",
                "icon": "⭐",
            },
            {
                "id": "sector-performance",
                "name": "섹터 성과",
                "description": "산업별 성과 분석",
                "defaultSize": "medium",
                "icon": "🏢",
            },
            {
                "id": "price-chart",
                "name": "차트",
                "description": "종목 가격 차트",
                "defaultSize": "large",
                "icon": "📈",
            },
            {
                "id": "economic-calendar",
                "name": "경제 캘린더",
                "description": "주요 경제 이벤트",
                "defaultSize": "medium",
                "icon": "📅",
            },
            {
                "id": "options-chain",
                "name": "옵션 체인",
                "description": "옵션 그릭스 분석",
                "defaultSize": "large",
                "icon": "📊",
            },
        ]
    }


@router.post("/save-preferences/{user_id}")
async def save_dashboard_preferences(user_id: str, data: dict):
    """대시보드 사용자 설정 저장"""
    try:
        from . import store

        with store._connect() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO user_dashboard_prefs
                   (user_id, refresh_interval, auto_update, grid_size, updated_at)
                   VALUES (?, ?, ?, ?, datetime('now'))""",
                (
                    user_id,
                    data.get("refreshInterval", 30),
                    int(data.get("autoUpdate", True)),
                    data.get("gridSize", "medium"),
                ),
            )
            conn.commit()

        return {
            "success": True,
            "message": "설정이 저장되었습니다",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/preferences/{user_id}")
async def get_dashboard_preferences(user_id: str):
    """대시보드 사용자 설정 조회"""
    try:
        from . import store

        with store._connect() as conn:
            prefs = conn.execute(
                """SELECT refresh_interval, auto_update, grid_size
                   FROM user_dashboard_prefs
                   WHERE user_id = ?""",
                (user_id,),
            ).fetchone()

        if prefs:
            return {
                "preferences": {
                    "refreshInterval": prefs[0],
                    "autoUpdate": bool(prefs[1]),
                    "gridSize": prefs[2],
                }
            }
        else:
            return {
                "preferences": {
                    "refreshInterval": 30,
                    "autoUpdate": True,
                    "gridSize": "medium",
                }
            }
    except Exception as e:
        return {
            "preferences": {
                "refreshInterval": 30,
                "autoUpdate": True,
                "gridSize": "medium",
            },
            "error": str(e),
        }
