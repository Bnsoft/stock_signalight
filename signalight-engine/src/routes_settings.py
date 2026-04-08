"""Settings Routes - User settings API routes"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

router = APIRouter(prefix="/api", tags=["settings"])


@router.put("/users/profile")
async def update_user_profile(user_id: str = Query(...), data: dict = {}):
    """Update user profile"""
    try:
        from . import store

        with store._connect() as conn:
            conn.execute(
                """UPDATE users
                   SET name = ?, email = ?, preferred_currency = ?, timezone = ?
                   WHERE user_id = ?""",
                (
                    data.get("name"),
                    data.get("email"),
                    data.get("preferred_currency", "USD"),
                    data.get("timezone", "Asia/Seoul"),
                    user_id,
                ),
            )
            conn.commit()

        return {
            "success": True,
            "message": "프로필이 업데이트되었습니다",
            "data": {
                "name": data.get("name"),
                "email": data.get("email"),
                "preferred_currency": data.get("preferred_currency"),
                "timezone": data.get("timezone"),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings/notifications")
async def update_notification_settings(user_id: str = Query(...), data: dict = {}):
    """Update notification settings"""
    try:
        from . import store
        import json

        with store._connect() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO user_settings
                   (user_id, notification_settings, updated_at)
                   VALUES (?, ?, datetime('now'))""",
                (user_id, json.dumps(data)),
            )
            conn.commit()

        return {
            "success": True,
            "message": "알림 설정이 업데이트되었습니다",
            "data": data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings/notifications")
async def get_notification_settings(user_id: str = Query(...)):
    """Retrieve notification settings"""
    try:
        from . import store
        import json

        with store._connect() as conn:
            result = conn.execute(
                """SELECT notification_settings FROM user_settings WHERE user_id = ?""",
                (user_id,),
            ).fetchone()

        if result:
            return {"settings": json.loads(result[0])}
        else:
            return {
                "settings": {
                    "email_enabled": True,
                    "push_enabled": True,
                    "sms_enabled": False,
                    "telegram_enabled": False,
                    "discord_enabled": False,
                    "quiet_hours_enabled": False,
                    "quiet_hours_start": "21:00",
                    "quiet_hours_end": "09:00",
                    "alert_frequency": "realtime",
                    "digest_enabled": False,
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings/preferences")
async def update_preferences(user_id: str = Query(...), data: dict = {}):
    """Update user preferences"""
    try:
        from . import store
        import json

        with store._connect() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO user_preferences
                   (user_id, theme, language, updated_at)
                   VALUES (?, ?, ?, datetime('now'))""",
                (
                    user_id,
                    data.get("theme", "dark"),
                    data.get("language", "ko"),
                ),
            )
            conn.commit()

        return {
            "success": True,
            "message": "환경 설정이 업데이트되었습니다",
            "data": {
                "theme": data.get("theme"),
                "language": data.get("language"),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings/preferences")
async def get_preferences(user_id: str = Query(...)):
    """Retrieve user preferences"""
    try:
        from . import store

        with store._connect() as conn:
            result = conn.execute(
                """SELECT theme, language FROM user_preferences WHERE user_id = ?""",
                (user_id,),
            ).fetchone()

        if result:
            return {
                "preferences": {
                    "theme": result[0],
                    "language": result[1],
                }
            }
        else:
            return {
                "preferences": {
                    "theme": "dark",
                    "language": "ko",
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings/password")
async def change_password(user_id: str = Query(...), data: dict = {}):
    """Change user password"""
    try:
        from . import store
        import bcrypt

        current_password = data.get("current_password")
        new_password = data.get("new_password")

        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="비밀번호는 필수입니다")

        with store._connect() as conn:
            user = conn.execute(
                "SELECT password_hash FROM users WHERE user_id = ?", (user_id,)
            ).fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

            # Verify current password
            if not bcrypt.checkpw(
                current_password.encode(), user[0].encode()
            ):
                raise HTTPException(status_code=401, detail="현재 비밀번호가 일치하지 않습니다")

            # Hash new password
            new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())

            conn.execute(
                "UPDATE users SET password_hash = ? WHERE user_id = ?",
                (new_hash.decode(), user_id),
            )
            conn.commit()

        return {
            "success": True,
            "message": "비밀번호가 변경되었습니다",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings/data-export")
async def export_user_data(user_id: str = Query(...)):
    """Export user data"""
    try:
        from . import store
        import json

        with store._connect() as conn:
            # Fetch user data
            user = conn.execute(
                "SELECT * FROM users WHERE user_id = ?", (user_id,)
            ).fetchone()

            # Fetch positions
            positions = conn.execute(
                "SELECT * FROM positions WHERE user_id = ?", (user_id,)
            ).fetchall()

            # Fetch alerts
            alerts = conn.execute(
                "SELECT * FROM price_alerts WHERE user_id = ?", (user_id,)
            ).fetchall()

            # Fetch orders
            orders = conn.execute(
                "SELECT * FROM broker_orders WHERE user_id = ?", (user_id,)
            ).fetchall()

        export_data = {
            "export_date": str(store.datetime.utcnow()),
            "user_id": user_id,
            "positions": len(positions),
            "alerts": len(alerts),
            "orders": len(orders),
        }

        return export_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/account")
async def delete_account(user_id: str = Query(...)):
    """Delete user account"""
    try:
        from . import store

        with store._connect() as conn:
            # Delete all user data
            conn.execute("DELETE FROM positions WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM price_alerts WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM indicator_alerts WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM broker_orders WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM broker_connections WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM user_settings WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM user_preferences WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
            conn.commit()

        return {
            "success": True,
            "message": "계정이 삭제되었습니다",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
