import logging
import pytz

from django.conf import settings
from django.utils.timezone import make_naive, is_aware


logger = None


def get_logger():
    """
    Get the unified MBP logger, which has a level defined by settings.DEBUG.
    """
    global logger
    if logger is None:
        logger = logging.getLogger('sateye')
        logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
        logger.info('Started logging for Sateye')

    return logger


def ensure_naive(date):
    """
    Ensure a datetime is timezone naive.
    """
    if is_aware(date):
        return make_naive(date, pytz.utc)
    else:
        return date
