from collections import namedtuple
from datetime import datetime
import pytz

from django.utils.timezone import make_naive, is_aware


def ensure_naive(date):
    """
    Ensure a datetime is timezone naive.
    """
    if is_aware(date):
        return make_naive(date, pytz.utc)
    else:
        return date
