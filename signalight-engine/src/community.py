"""Community and social features module"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import store


# ============= Community Posts & Discussion =============

def create_post(
    user_id: str,
    title: str,
    content: str,
    signal_id: Optional[int] = None,
    symbol: Optional[str] = None,
    post_type: str = "DISCUSSION"  # DISCUSSION, SIGNAL_ANALYSIS, STRATEGY, QUESTION
) -> Dict:
    """Create a community post"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO community_posts
               (user_id, title, content, signal_id, symbol, post_type, likes, comments_count, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)""",
            (user_id, title, content, signal_id, symbol.upper() if symbol else None, post_type,
             datetime.utcnow().isoformat())
        )
        conn.commit()

        post = conn.execute(
            "SELECT id FROM community_posts ORDER BY id DESC LIMIT 1"
        ).fetchone()

    return {
        "id": post[0],
        "user_id": user_id,
        "title": title,
        "post_type": post_type,
        "created_at": datetime.utcnow().isoformat()
    }


def get_community_feed(limit: int = 20, post_type: Optional[str] = None) -> List[Dict]:
    """Get community feed"""

    with store._connect() as conn:
        query = """SELECT id, user_id, title, content, post_type, symbol, likes, comments_count, created_at
                   FROM community_posts WHERE 1=1"""
        params = []

        if post_type:
            query += " AND post_type = ?"
            params.append(post_type)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(query, params).fetchall()

    return [
        {
            "id": r[0],
            "user_id": r[1],
            "title": r[2],
            "content": r[3],
            "post_type": r[4],
            "symbol": r[5],
            "likes": r[6],
            "comments_count": r[7],
            "created_at": r[8]
        }
        for r in rows
    ]


def like_post(user_id: str, post_id: int) -> bool:
    """Like a community post"""

    with store._connect() as conn:
        # Check if already liked
        existing = conn.execute(
            "SELECT id FROM community_post_likes WHERE user_id = ? AND post_id = ?",
            (user_id, post_id)
        ).fetchone()

        if existing:
            # Unlike
            conn.execute(
                "DELETE FROM community_post_likes WHERE user_id = ? AND post_id = ?",
                (user_id, post_id)
            )
            conn.execute("UPDATE community_posts SET likes = likes - 1 WHERE id = ?", (post_id,))
        else:
            # Like
            conn.execute(
                "INSERT INTO community_post_likes (user_id, post_id) VALUES (?, ?)",
                (user_id, post_id)
            )
            conn.execute("UPDATE community_posts SET likes = likes + 1 WHERE id = ?", (post_id,))

        conn.commit()

    return not bool(existing)


def comment_on_post(user_id: str, post_id: int, content: str) -> Dict:
    """Comment on a community post"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO community_comments
               (post_id, user_id, content, created_at)
               VALUES (?, ?, ?, ?)""",
            (post_id, user_id, content, datetime.utcnow().isoformat())
        )
        conn.execute("UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?", (post_id,))
        conn.commit()

        comment = conn.execute(
            "SELECT id FROM community_comments ORDER BY id DESC LIMIT 1"
        ).fetchone()

    return {
        "id": comment[0],
        "post_id": post_id,
        "user_id": user_id,
        "content": content,
        "created_at": datetime.utcnow().isoformat()
    }


def get_post_comments(post_id: int, limit: int = 20) -> List[Dict]:
    """Get comments for a post"""

    with store._connect() as conn:
        rows = conn.execute(
            """SELECT id, user_id, content, created_at
               FROM community_comments
               WHERE post_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (post_id, limit)
        ).fetchall()

    return [
        {
            "id": r[0],
            "user_id": r[1],
            "content": r[2],
            "created_at": r[3]
        }
        for r in rows
    ]


# ============= User Following & Matching =============

def follow_user(follower_id: str, following_id: str) -> bool:
    """Follow another user"""

    if follower_id == following_id:
        return False

    with store._connect() as conn:
        # Check if already following
        existing = conn.execute(
            "SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?",
            (follower_id, following_id)
        ).fetchone()

        if existing:
            conn.execute(
                "DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?",
                (follower_id, following_id)
            )
        else:
            conn.execute(
                "INSERT INTO user_follows (follower_id, following_id, created_at) VALUES (?, ?, ?)",
                (follower_id, following_id, datetime.utcnow().isoformat())
            )

        conn.commit()

    return not bool(existing)


def get_followers(user_id: str) -> List[str]:
    """Get followers of a user"""

    with store._connect() as conn:
        rows = conn.execute(
            "SELECT follower_id FROM user_follows WHERE following_id = ?",
            (user_id,)
        ).fetchall()

    return [r[0] for r in rows]


def get_following(user_id: str) -> List[str]:
    """Get users that a user is following"""

    with store._connect() as conn:
        rows = conn.execute(
            "SELECT following_id FROM user_follows WHERE follower_id = ?",
            (user_id,)
        ).fetchall()

    return [r[0] for r in rows]


def find_investor_matches(user_id: str) -> List[Dict]:
    """Find investors with similar trading style"""

    with store._connect() as conn:
        # Get user's profile
        user_profile = conn.execute(
            "SELECT risk_profile, experience_level FROM user_profiles WHERE user_id = ?",
            (user_id,)
        ).fetchone()

        if not user_profile:
            return []

        risk_profile, exp_level = user_profile

        # Find similar investors
        similar = conn.execute(
            """SELECT DISTINCT up.user_id, up.risk_profile, up.experience_level
               FROM user_profiles up
               WHERE up.user_id != ?
               AND up.risk_profile = ?
               AND up.experience_level = ?
               LIMIT 10""",
            (user_id, risk_profile, exp_level)
        ).fetchall()

    return [
        {
            "user_id": s[0],
            "risk_profile": s[1],
            "experience_level": s[2],
            "match_score": 85  # Simplified
        }
        for s in similar
    ]


# ============= Leaderboard =============

def get_leaderboard(period: str = "MONTHLY", limit: int = 20) -> List[Dict]:
    """Get leaderboard by performance"""

    with store._connect() as conn:
        # Simplified: get top performers
        rows = conn.execute(
            """SELECT user_id, AVG(roi_percent) as avg_roi, COUNT(*) as trade_count
               FROM signal_performance
               WHERE status = 'CLOSED'
               GROUP BY user_id
               ORDER BY avg_roi DESC
               LIMIT ?""",
            (limit,)
        ).fetchall()

    return [
        {
            "rank": idx + 1,
            "user_id": r[0],
            "avg_return": round(r[1], 2),
            "trade_count": r[2],
            "period": period
        }
        for idx, r in enumerate(rows)
    ]


def get_user_rank(user_id: str, period: str = "MONTHLY") -> Optional[Dict]:
    """Get user's rank on leaderboard"""

    with store._connect() as conn:
        # Get user's stats
        stats = conn.execute(
            """SELECT AVG(roi_percent), COUNT(*)
               FROM signal_performance
               WHERE user_id = ? AND status = 'CLOSED'""",
            (user_id,)
        ).fetchone()

        if not stats or stats[0] is None:
            return None

        avg_roi = stats[0]

        # Get rank
        rank = conn.execute(
            """SELECT COUNT(*) + 1
               FROM (SELECT user_id, AVG(roi_percent) as avg_roi
                     FROM signal_performance
                     WHERE status = 'CLOSED'
                     GROUP BY user_id)
               WHERE avg_roi > ?""",
            (avg_roi,)
        ).fetchone()[0]

    return {
        "user_id": user_id,
        "rank": rank,
        "avg_return": round(avg_roi, 2),
        "trade_count": stats[1],
        "period": period
    }


def get_monthly_challenges() -> List[Dict]:
    """Get current monthly trading challenges"""

    return [
        {
            "id": 1,
            "title": "수익 50% 달성",
            "description": "이 달에 50% 이상의 수익률을 달성하세요",
            "reward": "고급 배지",
            "current_month": datetime.now().strftime("%Y-%m"),
            "difficulty": "HARD"
        },
        {
            "id": 2,
            "title": "10개 신호 성공",
            "description": "10개의 신호를 정확하게 예측하세요",
            "reward": "1000 포인트",
            "current_month": datetime.now().strftime("%Y-%m"),
            "difficulty": "MEDIUM"
        },
        {
            "id": 3,
            "title": "손실 방지",
            "description": "한 달간 손실 없이 거래를 유지하세요",
            "reward": "보수 투자자 배지",
            "current_month": datetime.now().strftime("%Y-%m"),
            "difficulty": "EASY"
        }
    ]


def complete_challenge(user_id: str, challenge_id: int) -> Dict:
    """Complete a challenge"""

    return {
        "user_id": user_id,
        "challenge_id": challenge_id,
        "status": "COMPLETED",
        "completed_at": datetime.utcnow().isoformat()
    }


# ============= Mentoring =============

def create_mentoring_request(mentee_id: str, mentor_id: str, message: str) -> Dict:
    """Request mentoring from another user"""

    with store._connect() as conn:
        conn.execute(
            """INSERT INTO mentoring_requests
               (mentee_id, mentor_id, message, status, created_at)
               VALUES (?, ?, ?, 'PENDING', ?)""",
            (mentee_id, mentor_id, message, datetime.utcnow().isoformat())
        )
        conn.commit()

        request = conn.execute(
            "SELECT id FROM mentoring_requests ORDER BY id DESC LIMIT 1"
        ).fetchone()

    return {
        "id": request[0],
        "mentee_id": mentee_id,
        "mentor_id": mentor_id,
        "status": "PENDING"
    }


def get_mentoring_requests(user_id: str, role: str = "mentor") -> List[Dict]:
    """Get mentoring requests (as mentor or mentee)"""

    with store._connect() as conn:
        if role == "mentor":
            rows = conn.execute(
                """SELECT id, mentee_id, message, status, created_at
                   FROM mentoring_requests
                   WHERE mentor_id = ?
                   ORDER BY created_at DESC""",
                (user_id,)
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, mentor_id, message, status, created_at
                   FROM mentoring_requests
                   WHERE mentee_id = ?
                   ORDER BY created_at DESC""",
                (user_id,)
            ).fetchall()

    return [
        {
            "id": r[0],
            "other_user_id": r[1],
            "message": r[2],
            "status": r[3],
            "created_at": r[4]
        }
        for r in rows
    ]


def accept_mentoring(request_id: int) -> Dict:
    """Accept mentoring request"""

    with store._connect() as conn:
        conn.execute(
            "UPDATE mentoring_requests SET status = 'ACCEPTED' WHERE id = ?",
            (request_id,)
        )
        conn.commit()

    return {"request_id": request_id, "status": "ACCEPTED"}
