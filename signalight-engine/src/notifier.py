"""Multi-channel notification system (Email, Discord, Slack, Web Push)."""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# ============= Email (Resend) =============
async def send_email_alert(
    recipient_email: str,
    signal_type: str,
    symbol: str,
    severity: str,
    message: str,
    price: float,
) -> bool:
    """Send email alert via Resend."""
    try:
        from resend import Resend

        api_key = os.getenv("RESEND_API_KEY")
        if not api_key:
            logger.warning("RESEND_API_KEY not set")
            return False

        client = Resend(api_key=api_key)

        html = f"""
        <h2>Signalight Alert</h2>
        <p><strong>{severity}</strong> signal triggered for <strong>{symbol}</strong></p>
        <ul>
            <li>Signal: {signal_type}</li>
            <li>Price: ${price:.2f}</li>
            <li>Message: {message}</li>
        </ul>
        <p>Check your dashboard for more details.</p>
        """

        response = client.emails.send(
            {
                "from": "alerts@signalight.local",
                "to": recipient_email,
                "subject": f"[{severity}] {symbol} - {signal_type}",
                "html": html,
            }
        )

        logger.info(f"Email sent to {recipient_email}: {response}")
        return True

    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False


# ============= Discord =============
async def send_discord_alert(
    webhook_url: str,
    signal_type: str,
    symbol: str,
    severity: str,
    message: str,
    price: float,
) -> bool:
    """Send Discord embed alert."""
    try:
        import aiohttp

        color_map = {"ACTION": 0xFF4444, "WARNING": 0xFFAA00, "INFO": 0x4488FF}
        color = color_map.get(severity, 0x888888)

        embed = {
            "title": f"{severity} - {symbol}",
            "description": message,
            "color": color,
            "fields": [
                {"name": "Signal Type", "value": signal_type, "inline": True},
                {"name": "Price", "value": f"${price:.2f}", "inline": True},
            ],
            "footer": {"text": "Signalight"},
        }

        async with aiohttp.ClientSession() as session:
            await session.post(webhook_url, json={"embeds": [embed]})

        logger.info(f"Discord alert sent to {webhook_url}")
        return True

    except Exception as e:
        logger.error(f"Discord send failed: {e}")
        return False


# ============= Slack =============
async def send_slack_alert(
    webhook_url: str,
    signal_type: str,
    symbol: str,
    severity: str,
    message: str,
    price: float,
) -> bool:
    """Send Slack message alert."""
    try:
        import aiohttp

        color_map = {"ACTION": "danger", "WARNING": "warning", "INFO": "good"}
        color = color_map.get(severity, "#888888")

        payload = {
            "attachments": [
                {
                    "color": color,
                    "title": f"{severity}: {symbol} - {signal_type}",
                    "text": message,
                    "fields": [
                        {"title": "Price", "value": f"${price:.2f}", "short": True},
                    ],
                    "footer": "Signalight",
                }
            ]
        }

        async with aiohttp.ClientSession() as session:
            await session.post(webhook_url, json=payload)

        logger.info(f"Slack alert sent")
        return True

    except Exception as e:
        logger.error(f"Slack send failed: {e}")
        return False


# ============= Web Push =============
async def send_web_push(
    subscription: dict,
    title: str,
    body: str,
    icon: str = "/icon-192.png",
) -> bool:
    """Send web push notification."""
    try:
        from pywebpush import webpush, WebPushException

        data = {"title": title, "body": body, "icon": icon}

        webpush(
            subscription_info=subscription,
            data=str(data),
            vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
            vapid_claims={"sub": "mailto:noreply@signalight.local"},
        )

        logger.info("Web push sent")
        return True

    except Exception as e:
        logger.error(f"Web push failed: {e}")
        return False


# ============= Multi-Channel Router =============
async def notify_all_channels(
    signal_type: str,
    symbol: str,
    severity: str,
    message: str,
    price: float,
    user_prefs: dict,
) -> dict:
    """Route signal to all enabled channels based on user preferences."""
    results = {}

    # Email
    if user_prefs.get("email_enabled") and user_prefs.get("email"):
        results["email"] = await send_email_alert(
            user_prefs["email"], signal_type, symbol, severity, message, price
        )

    # Discord
    if user_prefs.get("discord_enabled") and user_prefs.get("discord_webhook"):
        results["discord"] = await send_discord_alert(
            user_prefs["discord_webhook"], signal_type, symbol, severity, message, price
        )

    # Slack
    if user_prefs.get("slack_enabled") and user_prefs.get("slack_webhook"):
        results["slack"] = await send_slack_alert(
            user_prefs["slack_webhook"], signal_type, symbol, severity, message, price
        )

    logger.info(f"Notification results: {results}")
    return results
