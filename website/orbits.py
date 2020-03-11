import pytz
from datetime import timedelta

import requests
from orbit_predictor.locations import Location
from orbit_predictor.sources import get_predictor_from_tle_lines
from orbit_predictor.utils import sun_azimuth_elevation

from django.utils.timezone import make_aware

from website.entities import Pass, Position
from website.utils import ensure_naive, get_logger


logger = get_logger()


def predict_path(satellite_id, tle, start_date, end_date, step_seconds):
    """
    Predict the positions of a satellite during a period of time, with certain step precision.
    """
    predictor = get_predictor_from_tle_lines(tle.split('\n'))

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
    current_id = None
    first_line = None

    def get_norad_id(tle_line):
        """
        Get the norad id from a TLE line.
        """
        return int(tle_line[2:7])

    for line_number, raw_line in enumerate(tles_response.content.decode('ascii').split('\n')):
        logger.debug("TLE line %s: %s", line_number, raw_line)
        try:
            if raw_line.startswith("1 "):
                if current_id is not None:
                    raise ValueError("Expected a second TLE line, but found a first one again")

                current_id = get_norad_id(raw_line)
                first_line = raw_line
            elif raw_line.startswith("2 "):
                if current_id is None:
                    raise ValueError("Found a second TLE line, without the first line before")
                elif current_id != get_norad_id(raw_line):
                    raise ValueError("Found a second TLE line with different id to the previous "
                                     "TLE line")

                tles_by_id[current_id] = '{}\n{}'.format(first_line, raw_line)
                logger.info("Parsed full TLE of satellite %s", current_id)

                current_id = None
                first_line = None

        except Exception as err:
            logger.error("Error parsing TLE line %s from Celestrak data: %s", line_number,
                         raw_line)
            logger.exception("Error:")

    return tles_by_id
