import pytest
import src.store as store_module
from src.store import init_db
from src.trigger import (
    evaluate_all_signals,
    check_rsi_signals,
    check_ma_crossover,
    check_drawdown_levels,
    check_bollinger_signals,
    check_volume_spike,
    SignalType,
    Severity,
)


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(store_module, "DB_PATH", db_path)
    import src.config as cfg
    monkeypatch.setattr(cfg, "DB_PATH", db_path)
    init_db()
    yield


def make_indicators(**kwargs) -> dict:
    base = {
        "current_price": 100.0,
        "ma_20": 100.0,
        "ma_60": 100.0,
        "rsi_14": 50.0,
        "bollinger_upper": 110.0,
        "bollinger_lower": 90.0,
        "drawdown_pct": -5.0,
        "volume": 1_000_000,
        "volume_avg": 1_000_000,
        "volume_ratio": 1.0,
    }
    base.update(kwargs)
    return base


# --- RSI ---

def test_rsi_oversold_triggers():
    ind = make_indicators(rsi_14=25.0)
    signals = check_rsi_signals("QQQ", ind)
    assert len(signals) == 1
    assert signals[0]["signal_type"] == SignalType.RSI_OVERSOLD.value
    assert signals[0]["severity"] == Severity.ACTION.value


def test_rsi_overbought_triggers():
    ind = make_indicators(rsi_14=75.0)
    signals = check_rsi_signals("QQQ", ind)
    assert len(signals) == 1
    assert signals[0]["signal_type"] == SignalType.RSI_OVERBOUGHT.value
    assert signals[0]["severity"] == Severity.WARNING.value


def test_rsi_neutral_no_signal():
    ind = make_indicators(rsi_14=50.0)
    assert check_rsi_signals("QQQ", ind) == []


def test_rsi_exactly_at_threshold_triggers():
    ind = make_indicators(rsi_14=30.0)
    signals = check_rsi_signals("QQQ", ind)
    assert len(signals) == 1


def test_rsi_cooldown_prevents_duplicate():
    ind = make_indicators(rsi_14=25.0)
    first = check_rsi_signals("QQQ", ind)
    assert len(first) == 1
    # Simulate saving the signal
    from src.store import save_signal
    save_signal("QQQ", first[0]["signal_type"], first[0]["severity"],
                first[0]["message"], ind, ind["current_price"])
    second = check_rsi_signals("QQQ", ind)
    assert len(second) == 0  # cooldown blocked it


# --- MA Crossover ---

def test_golden_cross_triggers():
    prev = make_indicators(ma_20=98.0, ma_60=100.0)
    curr = make_indicators(ma_20=102.0, ma_60=100.0)
    signals = check_ma_crossover("QQQ", curr, prev)
    assert len(signals) == 1
    assert signals[0]["signal_type"] == SignalType.MA_GOLDEN_CROSS.value


def test_death_cross_triggers():
    prev = make_indicators(ma_20=102.0, ma_60=100.0)
    curr = make_indicators(ma_20=98.0, ma_60=100.0)
    signals = check_ma_crossover("QQQ", curr, prev)
    assert len(signals) == 1
    assert signals[0]["signal_type"] == SignalType.MA_DEATH_CROSS.value


def test_no_crossover_no_signal():
    prev = make_indicators(ma_20=98.0, ma_60=100.0)
    curr = make_indicators(ma_20=99.0, ma_60=100.0)
    assert check_ma_crossover("QQQ", curr, prev) == []


def test_ma_crossover_missing_data():
    prev = make_indicators(ma_20=None, ma_60=100.0)
    curr = make_indicators(ma_20=102.0, ma_60=100.0)
    assert check_ma_crossover("QQQ", curr, prev) == []


# --- Drawdown ---

def test_drawdown_entry_triggers_for_qqq():
    ind = make_indicators(drawdown_pct=-12.0)
    signals = check_drawdown_levels("QQQ", ind)
    assert len(signals) == 1
    assert "-10%" in signals[0]["signal_type"]


def test_drawdown_multiple_levels_triggered():
    ind = make_indicators(drawdown_pct=-22.0)
    signals = check_drawdown_levels("QQQ", ind)
    # Should trigger -10%, -15%, -20% levels
    assert len(signals) == 3


def test_drawdown_not_triggered_for_non_qqq():
    ind = make_indicators(drawdown_pct=-20.0)
    assert check_drawdown_levels("SPY", ind) == []


def test_drawdown_no_trigger_above_threshold():
    ind = make_indicators(drawdown_pct=-5.0)
    assert check_drawdown_levels("QQQ", ind) == []


# --- Bollinger Bands ---

def test_price_below_bollinger_triggers():
    ind = make_indicators(current_price=85.0, bollinger_lower=90.0)
    signals = check_bollinger_signals("QQQ", ind)
    assert len(signals) == 1
    assert signals[0]["signal_type"] == SignalType.PRICE_BELOW_BOLLINGER.value


def test_price_above_bollinger_triggers():
    ind = make_indicators(current_price=115.0, bollinger_upper=110.0)
    signals = check_bollinger_signals("QQQ", ind)
    assert len(signals) == 1
    assert signals[0]["signal_type"] == SignalType.PRICE_ABOVE_BOLLINGER.value


def test_price_inside_bands_no_signal():
    ind = make_indicators(current_price=100.0, bollinger_upper=110.0, bollinger_lower=90.0)
    assert check_bollinger_signals("QQQ", ind) == []


# --- Volume Spike ---

def test_volume_spike_triggers():
    ind = make_indicators(volume=3_000_000, volume_avg=1_000_000, volume_ratio=3.0)
    signals = check_volume_spike("QQQ", ind)
    assert len(signals) == 1
    assert signals[0]["signal_type"] == SignalType.VOLUME_SPIKE.value
    assert signals[0]["severity"] == Severity.INFO.value


def test_volume_spike_below_threshold_no_signal():
    ind = make_indicators(volume=1_200_000, volume_avg=1_000_000, volume_ratio=1.2)
    assert check_volume_spike("QQQ", ind) == []


# --- evaluate_all_signals ---

def test_evaluate_returns_list():
    ind = make_indicators(rsi_14=25.0)
    result = evaluate_all_signals("QQQ", ind, ind)
    assert isinstance(result, list)
    assert len(result) >= 1


def test_evaluate_empty_indicators():
    assert evaluate_all_signals("QQQ", {}, {}) == []
