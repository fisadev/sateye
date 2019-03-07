from sgp4.earth_gravity import wgs84
from sgp4.io import twoline2rv
from orbit_predictor.accuratepredictor import HighAccuracyTLEPredictor
from orbit_predictor.predictors import TLEPredictor
from orbit_predictor.sources import MemoryTLESource


def get_predictor_from_tle_lines(tle_lines, precise=False):
    """
    This will be in orbit_predictor 1.8.7 when it gets released to pypi.
    """
    source = MemoryTLESource()
    sgp4_sat = twoline2rv(tle_lines[0], tle_lines[1], wgs84)
    source.add_tle(sgp4_sat.satnum, tuple(tle_lines), sgp4_sat.epoch)

    if precise:
        predictor = HighAccuracyTLEPredictor(sgp4_sat.satnum, source)
    else:
        predictor = TLEPredictor(sgp4_sat.satnum, source)

    return predictor
