"""Data Export Routes - 데이터 내보내기 API 라우트"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io
from . import data_export

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/portfolio")
async def export_portfolio(user_id: str = Query(...), format: str = Query("csv")):
    """포트폴리오 내보내기"""
    try:
        if format == "csv":
            content = data_export.export_portfolio_to_csv(user_id)
            return StreamingResponse(
                iter([content.encode()]),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=portfolio.csv"},
            )
        elif format == "excel":
            content = data_export.export_portfolio_to_excel(user_id)
            return StreamingResponse(
                iter([content]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=portfolio.xlsx"},
            )
        elif format == "pdf":
            content = data_export.export_portfolio_to_pdf(user_id)
            return StreamingResponse(
                iter([content]),
                media_type="application/pdf",
                headers={"Content-Disposition": "attachment; filename=portfolio.pdf"},
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backtest")
async def export_backtest(user_id: str = Query(...), format: str = Query("csv")):
    """백테스트 결과 내보내기"""
    try:
        if format == "csv":
            content = data_export.export_backtest_results_to_csv(
                symbol="SPY",
                strategy="Moving Average Crossover",
                backtest_data={
                    "initial_capital": 100000,
                    "final_value": 145000,
                    "total_return_percent": 45.0,
                    "total_trades": 24,
                    "winning_trades": 16,
                    "losing_trades": 8,
                    "win_rate": 66.67,
                    "sharpe_ratio": 1.85,
                    "max_drawdown_percent": 12.5,
                },
            )
            return StreamingResponse(
                iter([content.encode()]),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=backtest.csv"},
            )
        elif format == "excel":
            content = data_export.export_portfolio_to_excel(user_id)
            return StreamingResponse(
                iter([content]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=backtest.xlsx"},
            )
        elif format == "json":
            report = {
                "strategy": "Moving Average Crossover",
                "symbol": "SPY",
                "initial_capital": 100000,
                "final_value": 145000,
                "total_return": 45000,
                "total_return_percent": 45.0,
                "total_trades": 24,
                "winning_trades": 16,
                "losing_trades": 8,
                "win_rate": 66.67,
                "sharpe_ratio": 1.85,
                "max_drawdown_percent": 12.5,
            }
            content = data_export.export_report_to_json(report)
            return StreamingResponse(
                iter([content.encode()]),
                media_type="application/json",
                headers={"Content-Disposition": "attachment; filename=backtest.json"},
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def export_alerts(user_id: str = Query(...), format: str = Query("csv")):
    """알람 내보내기"""
    try:
        if format == "csv":
            content = data_export.export_alerts_to_csv(user_id)
            return StreamingResponse(
                iter([content.encode()]),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=alerts.csv"},
            )
        elif format == "excel":
            content = data_export.export_portfolio_to_excel(user_id)
            return StreamingResponse(
                iter([content]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=alerts.xlsx"},
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions")
async def export_transactions(user_id: str = Query(...), format: str = Query("csv"), start_date: str = Query(None)):
    """거래 이력 내보내기"""
    try:
        if format == "csv":
            content = data_export.export_transactions_to_csv(user_id, start_date)
            return StreamingResponse(
                iter([content.encode()]),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=transactions.csv"},
            )
        elif format == "excel":
            content = data_export.export_portfolio_to_excel(user_id)
            return StreamingResponse(
                iter([content]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=transactions.xlsx"},
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly-report")
async def export_monthly_report(user_id: str = Query(...), year: int = Query(...), month: int = Query(...), format: str = Query("csv")):
    """월간 리포트 내보내기"""
    try:
        report = data_export.generate_monthly_report(user_id, year, month)

        if format == "csv":
            content = f"""월간 리포트 - {year}년 {month}월

기간: {report['period']}
거래 수: {report['trades_count']}
포트폴리오 가치: ${report['portfolio_value']:,.2f}
월간 손익: ${report['monthly_pnl']:,.2f}
월간 수익률: {report['monthly_return_percent']:.2f}%
포지션 수: {report['positions_count']}
최고 포지션: {report['top_position']}
"""
            return StreamingResponse(
                iter([content.encode()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=monthly_report_{year}_{month}.csv"},
            )
        elif format == "json":
            content = data_export.export_report_to_json(report)
            return StreamingResponse(
                iter([content.encode()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=monthly_report_{year}_{month}.json"},
            )
        elif format == "pdf":
            pdf_content = data_export.export_portfolio_to_pdf(user_id)
            return StreamingResponse(
                iter([pdf_content]),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=monthly_report_{year}_{month}.pdf"},
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/annual-report")
async def export_annual_report(user_id: str = Query(...), year: int = Query(...), format: str = Query("csv")):
    """연간 리포트 내보내기"""
    try:
        report = data_export.generate_annual_report(user_id, year)

        if format == "csv":
            content = f"""연간 리포트 - {year}년

총 거래 수: {report['total_trades']}
연간 손익: ${report['total_annual_pnl']:,.2f}
연간 수익률: {report['annual_return_percent']:.2f}%
최고 월: {report['best_month']}
최저 월: {report['worst_month']}

월별 상세:
"""
            for monthly in report['monthly_breakdown']:
                content += f"{monthly['period']}: {monthly['monthly_return_percent']:.2f}% ({monthly['trades_count']} 거래)\n"

            return StreamingResponse(
                iter([content.encode()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=annual_report_{year}.csv"},
            )
        elif format == "json":
            content = data_export.export_report_to_json(report)
            return StreamingResponse(
                iter([content.encode()]),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=annual_report_{year}.json"},
            )
        elif format == "pdf":
            pdf_content = data_export.export_portfolio_to_pdf(user_id)
            return StreamingResponse(
                iter([pdf_content]),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=annual_report_{year}.pdf"},
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{user_id}")
async def get_export_summary(user_id: str):
    """내보내기 요약 정보"""
    try:
        summary = data_export.create_export_summary(user_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
