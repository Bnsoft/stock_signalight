"""Education and learning courses module"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


def get_courses(category: Optional[str] = None, level: Optional[str] = None) -> List[Dict]:
    """Get available courses"""

    with store._connect() as conn:
        query = "SELECT id, title, category, level, description, duration_minutes, instructor, thumbnail_url, created_at FROM courses WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)

        if level:
            query += " AND level = ?"
            params.append(level)

        query += " ORDER BY created_at DESC"

        rows = conn.execute(query, params).fetchall()

    return [
        {
            "id": r[0],
            "title": r[1],
            "category": r[2],
            "level": r[3],
            "description": r[4],
            "duration_minutes": r[5],
            "instructor": r[6],
            "thumbnail_url": r[7],
            "created_at": r[8]
        }
        for r in rows
    ]


def get_course_details(course_id: int) -> Optional[Dict]:
    """Get detailed course information"""

    with store._connect() as conn:
        course = conn.execute(
            """SELECT id, title, category, level, description, duration_minutes,
                      instructor, thumbnail_url, content, created_at
               FROM courses WHERE id = ?""",
            (course_id,)
        ).fetchone()

        if not course:
            return None

        # Get lessons
        lessons = conn.execute(
            """SELECT id, title, duration_minutes, order_number FROM lessons
               WHERE course_id = ? ORDER BY order_number ASC""",
            (course_id,)
        ).fetchall()

    return {
        "id": course[0],
        "title": course[1],
        "category": course[2],
        "level": course[3],
        "description": course[4],
        "duration_minutes": course[5],
        "instructor": course[6],
        "thumbnail_url": course[7],
        "content": course[8],
        "lessons": [
            {"id": l[0], "title": l[1], "duration_minutes": l[2], "order": l[3]}
            for l in lessons
        ]
    }


def enroll_in_course(user_id: str, course_id: int) -> Dict:
    """Enroll user in a course"""

    with store._connect() as conn:
        # Check if already enrolled
        existing = conn.execute(
            "SELECT id FROM user_courses WHERE user_id = ? AND course_id = ?",
            (user_id, course_id)
        ).fetchone()

        if existing:
            return {"error": "Already enrolled"}

        # Enroll user
        conn.execute(
            """INSERT INTO user_courses
               (user_id, course_id, enrollment_date, status)
               VALUES (?, ?, ?, 'IN_PROGRESS')""",
            (user_id, course_id, datetime.utcnow().isoformat())
        )
        conn.commit()

    return {"status": "enrolled", "user_id": user_id, "course_id": course_id}


def get_user_courses(user_id: str) -> List[Dict]:
    """Get courses a user is enrolled in"""

    with store._connect() as conn:
        rows = conn.execute(
            """SELECT c.id, c.title, c.category, c.level, uc.status, uc.progress_percent, uc.enrollment_date
               FROM user_courses uc
               JOIN courses c ON uc.course_id = c.id
               WHERE uc.user_id = ?
               ORDER BY uc.enrollment_date DESC""",
            (user_id,)
        ).fetchall()

    return [
        {
            "id": r[0],
            "title": r[1],
            "category": r[2],
            "level": r[3],
            "status": r[4],
            "progress_percent": r[5],
            "enrollment_date": r[6]
        }
        for r in rows
    ]


def update_course_progress(user_id: str, course_id: int, progress_percent: float) -> Dict:
    """Update user's progress in a course"""

    status = "COMPLETED" if progress_percent >= 100 else "IN_PROGRESS"

    with store._connect() as conn:
        conn.execute(
            """UPDATE user_courses
               SET progress_percent = ?, status = ?, last_accessed = ?
               WHERE user_id = ? AND course_id = ?""",
            (progress_percent, status, datetime.utcnow().isoformat(), user_id, course_id)
        )
        conn.commit()

    return {
        "user_id": user_id,
        "course_id": course_id,
        "progress_percent": progress_percent,
        "status": status
    }


def get_signal_guide(signal_type: str) -> Dict:
    """Get interpretation guide for a signal type"""

    signal_guides = {
        "RSI_OVERSOLD": {
            "name": "RSI 과매도",
            "description": "RSI가 30 이하로 떨어지면 과매도 상태를 나타냅니다.",
            "interpretation": "매수 기회일 수 있습니다.",
            "risk_level": "낮음",
            "accuracy": "65%"
        },
        "RSI_OVERBOUGHT": {
            "name": "RSI 과매수",
            "description": "RSI가 70 이상이면 과매수 상태를 나타냅니다.",
            "interpretation": "매도 기회일 수 있습니다.",
            "risk_level": "낮음",
            "accuracy": "63%"
        },
        "MACD_CROSSOVER": {
            "name": "MACD 교차",
            "description": "MACD선이 Signal선을 상향 교차하면 강세 신호입니다.",
            "interpretation": "장기 상승 추세의 시작 신호",
            "risk_level": "중간",
            "accuracy": "72%"
        },
        "MA_CROSS_UP": {
            "name": "이동평균선 상향 교차",
            "description": "단기 MA가 장기 MA를 상향 교차",
            "interpretation": "강한 상승 신호",
            "risk_level": "낮음",
            "accuracy": "68%"
        },
        "VWAP_BREAK": {
            "name": "VWAP 돌파",
            "description": "가격이 VWAP을 상향 돌파",
            "interpretation": "기관 투자자들의 관심 증가",
            "risk_level": "낮음",
            "accuracy": "70%"
        }
    }

    return signal_guides.get(signal_type, {
        "name": signal_type,
        "description": "신호에 대한 정보가 없습니다.",
        "interpretation": "일반적인 신호입니다.",
        "risk_level": "알 수 없음",
        "accuracy": "Unknown"
    })


def get_case_studies(category: Optional[str] = None) -> List[Dict]:
    """Get success and failure case studies"""

    with store._connect() as conn:
        query = """SELECT id, title, category, outcome, stock_symbol, entry_price, exit_price,
                         return_percent, lessons_learned, created_at
                   FROM case_studies WHERE 1=1"""
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY created_at DESC"

        rows = conn.execute(query, params).fetchall()

    return [
        {
            "id": r[0],
            "title": r[1],
            "category": r[2],
            "outcome": r[3],
            "stock_symbol": r[4],
            "entry_price": r[5],
            "exit_price": r[6],
            "return_percent": r[7],
            "lessons_learned": r[8],
            "created_at": r[9]
        }
        for r in rows
    ]


def create_course(
    title: str,
    category: str,  # "BASICS", "INDICATORS", "STRATEGIES", "RISK_MANAGEMENT"
    level: str,  # "BEGINNER", "INTERMEDIATE", "ADVANCED"
    description: str,
    duration_minutes: int,
    instructor: str,
    content: str,
    thumbnail_url: Optional[str] = None
) -> Dict:
    """Create a new course"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO courses
               (title, category, level, description, duration_minutes, instructor, content, thumbnail_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (title, category, level, description, duration_minutes, instructor, content, thumbnail_url,
             datetime.utcnow().isoformat())
        )
        conn.commit()

        course = conn.execute(
            "SELECT id FROM courses ORDER BY id DESC LIMIT 1"
        ).fetchone()

    return {
        "id": course[0],
        "title": title,
        "category": category,
        "level": level,
        "description": description,
        "duration_minutes": duration_minutes
    }


def add_lesson_to_course(course_id: int, title: str, content: str, order_number: int, duration_minutes: int) -> Dict:
    """Add a lesson to a course"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO lessons
               (course_id, title, content, order_number, duration_minutes, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (course_id, title, content, order_number, duration_minutes, datetime.utcnow().isoformat())
        )
        conn.commit()

        lesson = conn.execute(
            "SELECT id FROM lessons ORDER BY id DESC LIMIT 1"
        ).fetchone()

    return {
        "id": lesson[0],
        "course_id": course_id,
        "title": title,
        "order_number": order_number,
        "duration_minutes": duration_minutes
    }


def get_learning_recommendations(user_id: str) -> List[Dict]:
    """Get personalized course recommendations based on user's trading history"""

    # Get user's experience level
    with store._connect() as conn:
        profile = conn.execute(
            "SELECT experience_level FROM user_profiles WHERE user_id = ?",
            (user_id,)
        ).fetchone()

    experience = profile[0] if profile else "beginner"

    # Map experience to recommended level
    level_map = {
        "beginner": "BEGINNER",
        "intermediate": "INTERMEDIATE",
        "expert": "ADVANCED"
    }

    recommended_level = level_map.get(experience, "BEGINNER")

    # Get recommended courses
    with store._connect() as conn:
        courses = conn.execute(
            """SELECT id, title, category, level, description, duration_minutes
               FROM courses
               WHERE level = ?
               ORDER BY RANDOM()
               LIMIT 5""",
            (recommended_level,)
        ).fetchall()

    return [
        {
            "id": c[0],
            "title": c[1],
            "category": c[2],
            "level": c[3],
            "description": c[4],
            "duration_minutes": c[5],
            "reason": f"{recommended_level} 수준에 맞는 강의"
        }
        for c in courses
    ]


def track_learning_progress(user_id: str) -> Dict:
    """Track user's overall learning progress"""

    with store._connect() as conn:
        # Get enrollments
        enrollments = conn.execute(
            "SELECT COUNT(*) FROM user_courses WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]

        # Get completed courses
        completed = conn.execute(
            "SELECT COUNT(*) FROM user_courses WHERE user_id = ? AND status = 'COMPLETED'",
            (user_id,)
        ).fetchone()[0]

        # Get average progress
        progress = conn.execute(
            "SELECT AVG(progress_percent) FROM user_courses WHERE user_id = ?",
            (user_id,)
        ).fetchone()[0]

    return {
        "user_id": user_id,
        "total_courses_enrolled": enrollments,
        "courses_completed": completed,
        "average_progress": round(progress or 0, 1),
        "completion_rate": round((completed / enrollments * 100) if enrollments > 0 else 0, 1)
    }
