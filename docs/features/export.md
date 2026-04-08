# Data Export & Reports

Module: `data_export.py` · Page: `/dashboard/data-export`

## Export Formats

| Format | Library | Fallback |
|--------|---------|---------|
| CSV | stdlib `csv` | — |
| Excel (.xlsx) | `openpyxl` | Falls back to CSV if not installed |
| PDF | `reportlab` | Falls back to CSV if not installed |
| JSON | stdlib `json` | — |

## Frontend Endpoints (unified, uses Authorization header for user_id)

| API | Query Params | Output |
|-----|-------------|--------|
| GET `/api/export/portfolio` | `?format=csv\|excel\|pdf` | Portfolio positions file download |
| GET `/api/export/alerts` | `?format=csv` | Alerts list CSV |
| GET `/api/export/transactions` | `?format=csv&start_date=` | Transaction history CSV |
| GET `/api/export/backtest` | `?format=csv&symbol=&strategy=` | Backtest results CSV |
| GET `/api/export/monthly-report` | `?year=2026&month=4&format=json\|csv` | Monthly P&L report |
| GET `/api/export/annual-report` | `?year=2026&format=json\|csv` | Annual report |

User extraction: `Authorization: Bearer {user_id}.{ts}.{sig}` → splits on `.` → `parts[0]` = user_id

## Backend Endpoints (user_id in path)

| API | Output |
|-----|--------|
| GET `/api/export/portfolio/csv/{user_id}` | Streaming CSV response |
| GET `/api/export/portfolio/excel/{user_id}` | Streaming XLSX response |
| GET `/api/export/portfolio/pdf/{user_id}` | Streaming PDF response |
| GET `/api/export/alerts/csv/{user_id}` | Alerts CSV |
| GET `/api/export/transactions/csv/{user_id}` | Transactions CSV |
| GET `/api/export/summary/{user_id}` | Available format list |
| GET `/api/report/monthly/{user_id}` | `?year&month` → JSON |
| GET `/api/report/annual/{user_id}` | `?year` → JSON |
| GET `/api/report/json/{user_id}` | `?year` → downloadable JSON |

## Functions (`data_export.py`)

| Function | Returns |
|----------|---------|
| `export_portfolio_to_csv(user_id)` | CSV string |
| `export_portfolio_to_excel(user_id)` | bytes |
| `export_portfolio_to_pdf(user_id)` | bytes |
| `export_backtest_results_to_csv(symbol, strategy, data)` | CSV string |
| `export_alerts_to_csv(user_id)` | CSV string |
| `export_transactions_to_csv(user_id, start_date)` | CSV string |
| `generate_monthly_report(user_id, year, month)` | dict |
| `generate_annual_report(user_id, year)` | dict with `monthly_breakdown[]` |
| `export_report_to_json(report)` | JSON string |
| `create_export_summary(user_id)` | `{formats_available, data_types}` |

## Monthly Report Structure
```json
{ "year": 2026, "month": 4, "period": "2026-04",
  "trades_count": 12, "portfolio_value": 125000,
  "monthly_pnl": 3500, "monthly_return_percent": 2.8, "positions_count": 8 }
```

## Annual Report Structure
```json
{ "year": 2026, "total_trades": 145,
  "total_annual_pnl": 18500, "annual_return_percent": 18.5,
  "best_month": "2026-03", "worst_month": "2026-01",
  "monthly_breakdown": [...] }
```

## Content-Type Headers
- CSV: `text/csv` + `Content-Disposition: attachment; filename=portfolio.csv`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PDF: `application/pdf`
- JSON: `application/json`
