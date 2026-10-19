import datetime
from typing import Optional


def get_next_trading_day(current_date_str: str) -> str:
    """
    Estimates the next likely trading day by advancing to the next weekday
    (skipping Saturday and Sunday).
    Returns ISO date string (YYYY-MM-DD).
    """
    current_date = datetime.datetime.strptime(current_date_str[:10], "%Y-%m-%d").date()
    next_day = current_date + datetime.timedelta(days=1)
    
    # 5 is Saturday, 6 is Sunday
    while next_day.weekday() >= 5:
        next_day += datetime.timedelta(days=1)
        
    return next_day.isoformat()


def is_weekend(date_str: str) -> bool:
    d = datetime.datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    return d.weekday() >= 5
