import pytz
from datetime import datetime, timedelta
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


def get_norad_id(tle):
    """
    Get the norad id from a TLE.
    """
    _, line1, line2 = split_tle(tle)
    id_line1 = int(line1[2:7])
    id_line2 = int(line2[2:7])

    if id_line1 != id_line2:
        raise ValueError(
            "Lines 1 and 2 from the TLE differ in norad id!: {} {}".format(
                id_line1, id_line2
            )
        )

    return id_line1


def get_tle_date(tle):
    """
    Get the date at which the TLE was measured.
    """
    _, line1, _ = split_tle(tle)

    year = int(line1[18:20])
    # yes, really
    if year < 57:
        year = 2000 + year
    else:
        year = 1900 + year

    day = float(line1[20:32])
    # substracting one day, day 1.0 means 1/1 at 0:0:0
    # yes, really, again
    days_since_jan_1st = timedelta(days=day - 1)

    tle_date = datetime(year, 1, 1, 0, 0, 0) + days_since_jan_1st
    return make_aware(tle_date, timezone=pytz.utc)


def get_tles(tles_url="https://www.celestrak.com/NORAD/elements/active.txt"):
    """
    Get the latest TLEs from the Celestrak service.
    """
    logger.info("Getting TLE data from Celestrak...")
    tles_response = requests.get(tles_url)
    logger.info("Celestrak response received")

    if tles_response.status_code != 200:
        logger.error("Error getting TLE data from Celestrak")

    tles_by_id = {}

    raw_tle_lines = tles_response.content.decode('ascii').split('\n')

    for sate_index in range(int(len(raw_tle_lines) / 3)):
        lines_start_at = sate_index * 3
        try:
            tle = '\n'.join(raw_tle_lines[lines_start_at:lines_start_at + 3])
            tle = tle.replace('\r', '')

            norad_id = get_norad_id(tle)
            tles_by_id[norad_id] = tle

            logger.info("Parsed full TLE of satellite %s", norad_id)
        except Exception as err:
            logger.error("Error parsing TLE data from Celestrak, at line %s: %s",
                         lines_start_at, raw_tle_lines[lines_start_at])
            logger.exception("Error:")

    return tles_by_id
