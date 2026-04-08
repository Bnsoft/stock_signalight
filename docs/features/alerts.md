# Alert System

Module: `alerts_advanced.py` · Page: `/dashboard/alerts`

## Alert Types

| Type | Trigger Condition | Create API |
|------|------------------|-----------|
| **Price** | Price above/below/between levels | POST `/api/alerts/price` |
| **Indicator** | RSI/MACD/Bollinger/Volume/MA condition | POST `/api/alerts/indicator` |
| **Volume** | Unusual volume / volume threshold | POST `/api/alerts/volume` |
| **Portfolio** | Portfolio gain/loss / position loss | POST `/api/alerts/portfolio` |
| **News** | Keyword match in news feed | POST `/api/alerts/news` |
| **Time** | Scheduled time alert | POST `/api/alerts/time` |
| **Composite** | Multiple conditions (AND/OR logic) | POST `/api/alerts/composite` |

## Request Bodies

### Price Alert
```json
{ "symbol": "AAPL", "alert_type": "PRICE_ABOVE|PRICE_BELOW|PRICE_BETWEEN",
  "trigger_price": 150.0, "trigger_price_high": 160.0,
  "notify_methods": ["PUSH","EMAIL"], "repeat_alert": true }
```

### Indicator Alert
```json
{ "symbol": "SPY", "indicator": "RSI|MACD|BOLLINGER|VOLUME|MA",
  "condition": "ABOVE|BELOW|CROSS_ABOVE|CROSS_BELOW",
  "threshold": 70.0, "timeframe": "1D", "notify_methods": ["PUSH"] }
```

### Volume Alert
```json
{ "symbol": "TSLA", "alert_type": "UNUSUAL_VOLUME|VOLUME_ABOVE|VOLUME_BELOW",
  "volume_threshold": 5000000, "multiplier": 2.0, "notify_methods": ["PUSH"] }
```

### Portfolio Alert
```json
{ "alert_type": "PORTFOLIO_GAIN|PORTFOLIO_LOSS|POSITION_LOSS|DAILY_LOSS",
  "threshold": 5.0, "notify_methods": ["PUSH","EMAIL"] }
```

### News Alert
```json
{ "symbol": "AAPL", "keywords": ["earnings","FDA","merger"],
  "sentiment": "NEGATIVE", "notify_methods": ["PUSH"] }
```

### Time Alert
```json
{ "symbol": "SPY", "alert_time": "09:30", "message": "Market open check",
  "recurring": "DAILY|WEEKLY|ONCE", "days_of_week": ["MON","FRI"],
  "notify_methods": ["PUSH"] }
```

### Composite Alert
```json
{ "symbol": "AAPL", "logic": "AND|OR",
  "conditions": [{"type":"RSI","condition":"BELOW","value":30}, {"type":"VOLUME","condition":"ABOVE","value":2}],
  "notify_methods": ["PUSH","TELEGRAM"] }
```

## Management APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/alerts?user_id=` | All user alerts |
| PUT | `/api/alerts/{alert_id}/toggle` | Enable/disable |
| DELETE | `/api/alerts/{alert_id}` | Delete alert |
| GET | `/api/alerts/history?user_id=` | Trigger history |

## Notification Channels

| Channel | Config Field | Notes |
|---------|-------------|-------|
| Push | `push: true` | Default, always available |
| Email | `email: true` | Requires email on account |
| SMS | `sms: true` | Via notifier.py |
| Telegram | `telegram: true` | Requires bot token config |
| Discord | `discord: true` | Requires webhook config |

### Channel Settings API
```
POST /api/alerts/settings?user_id=
Body: { "email": true, "push": true, "sms": false,
        "telegram": false, "discord": false, "quiet_hours": "22:00-08:00" }
```

## DB Tables
- `price_alerts` — `id, user_id, symbol, alert_type, trigger_price, notify_methods, status`
- `indicator_alerts` — `id, user_id, symbol, indicator, condition, threshold, status`
- `alert_history` — `alert_id, triggered_at, message`
