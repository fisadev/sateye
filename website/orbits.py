import pytz
from datetime import timedelta
from enum import Enum

import requests
from orbit_predictor.locations import Location
from orbit_predictor.sources import get_predictor_from_tle_lines
from orbit_predictor.utils import sun_azimuth_elevation

from django.utils.timezone import make_aware

from website.entities import Pass, Position
from website.utils import ensure_naive, get_logger


logger = get_logger()


def split_tle(tle):
    """
    Extract the lines from a TLE, return a 3-tuple with Nones for the missing lines.
    """
    lines = tle.split('\n')
    if len(lines) == 3:
        title, line1, line2 = lines
    else:
        title = None
        line1, line2 = lines

    return title, line1, line2


def predict_path(satellite_id, tle, start_date, end_date, step_seconds):
    """
    Predict the positions of a satellite during a period of time, with certain step precision.
    """
    _, line1, line2 = split_tle(tle)
    predictor = get_predictor_from_tle_lines((line1, line2))

    assert start_date < end_date
    step = timedelta(seconds=step_seconds)

    # iterate over time, returning the position at each moment
    current_date = start_date
    while current_date <= end_date:
        # the predictor works with naive dates only
        naive_current_date = ensure_naive(current_date)
        lat, lon, elevation_km = predictor.get_position(naive_current_date).position_llh
        yield Position(lat, lon, elevation_km * 1000,
                       object_id=satellite_id, at_date=current_date)
        current_date += step


def predict_passes(satellite_id, tle, target, start_date, end_date, min_tca_elevation=None,
                   min_sun_elevation=None):
    """
    Predict the passes of a satellite over a location on TCA between two dates.
    """
    predictor = get_predictor_from_tle_lines(tle.split('\n'))
    location = target.as_op_location()

    start_date = ensure_naive(start_date)
    end_date = ensure_naive(end_date)

    # this is done like this, because orbit_predictor interprets max_elevation_gt=None as
    # an angle and explodes
    extra_filters = {}
    if min_tca_elevation is not None:
        extra_filters['max_elevation_gt'] = min_tca_elevation

    passes_iterator = predictor.passes_over(location, start_date, limit_date=end_date,
                                            **extra_filters)

    for pass_ in passes_iterator:
        azimuth_elevation = sun_azimuth_elevation(
            location.latitude_deg, location.longitude_deg, pass_.max_elevation_date,
        )

        if min_sun_elevation is not None and azimuth_elevation.elevation < min_sun_elevation:
            # Sun is too low, skip this pass
            continue

        yield Pass(
            satellite_id=satellite_id,
            target_id=target.object_id,
            aos=make_aware(pass_.aos, timezone=pytz.utc),
            los=make_aware(pass_.los, timezone=pytz.utc),
            tca=make_aware(pass_.max_elevation_date, timezone=pytz.utc),
            tca_elevation=pass_.max_elevation_deg,
            sun_azimuth=azimuth_elevation.azimuth,
            sun_elevation=azimuth_elevation.elevation,
        )


class TLEParts(Enum):
    """
    The three parts of a TLE.
    """
    TITLE = 0
    LINE1 = 1
    LINE2 = 2


def get_norad_id(tle):
    """
    Get the norad id from a TLE.
    """
    title, line1, line2 = split_tle(tle)
    id_line1 = int(line1[2:7])
    id_line2 = int(line2[2:7])

    if id_line1 != id_line2:
        raise ValueError(
            "Lines 1 and 2 from the TLE differ in norad id!: {} {}".format(
                id_line1, id_line2
            )
        )

    return id_line1


def get_tles():
    """
    Get the latest TLEs from the Celestrak service.
    """
    logger.info("Getting TLE data from Celestrak...")
    tles_response = requests.get("https://www.celestrak.com/NORAD/elements/active.txt")
    logger.info("Celestrak response received")

    if tles_response.status_code != 200:
        logger.error("Error getting TLE data from Celestrak")

    tles_by_id = {}
    expecting_part = TLEParts.TITLE
    current_title = None
    current_line1 = None

    for line_number, raw_line in enumerate(tles_response.content.decode('ascii').split('\n')):
        logger.debug("TLEs file line %s: %s", line_number, raw_line)
        if not raw_line.strip():
            continue

        try:
            if not raw_line.startswith(("1 ", "2 ")):
                current_part = TLEParts.TITLE
            elif raw_line.startswith("1 "):
                current_part = TLEParts.LINE1
            elif raw_line.startswith("2 "):
                current_part = TLEParts.LINE2

            if current_part is not expecting_part:
                raise ValueError(
                    "Expected {} of TLE, but found {}".format(expecting_part, current_part)
                )

            if current_part is TLEParts.TITLE:
                current_title = raw_line
                expecting_part = TLEParts.LINE1
            elif current_part is TLEParts.LINE1:
                current_line1 = raw_line
                expecting_part = TLEParts.LINE2
            elif current_part is TLEParts.LINE2:
                tle = '\n'.join((current_title, current_line1, raw_line))
                norad_id = get_norad_id(tle)

                tles_by_id[norad_id] = tle

                logger.info("Parsed full TLE of satellite %s", norad_id)

                current_title = None
                current_line1 = None
                expecting_part = TLEParts.TITLE

        except Exception as err:
            logger.error("Error parsing TLE line %s from Celestrak data: %s", line_number,
                         raw_line)
            logger.exception("Error:")

    return tles_by_id
