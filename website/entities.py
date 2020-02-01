import attr
from orbit_predictor.locations import Location


@attr.s
class Position:
    """
    A position with respect to the Earth.
    """
    latitude = attr.ib()  # degrees
    longitude = attr.ib()  # degrees
    altitude = attr.ib(default=0)  # meters

    object_id = attr.ib(default=None)
    at_date = attr.ib(default=None)

    def as_op_location(self):
        """
        Return an equivalent orbit predictor Location.
        """
        return Location('position', latitude_deg=self.latitude, longitude_deg=self.longitude,
                        elevation_m=self.altitude)


@attr.s
class Pass:
    """
    A pass of a satellite over a location.
    """
    aos = attr.ib()
    tca = attr.ib()
    los = attr.ib()
    tca_elevation = attr.ib()  # degrees
    sun_azimuth = attr.ib()  # degrees
    sun_elevation = attr.ib()  # degrees

    satellite_id = attr.ib(default=None)
    target_id = attr.ib(default=None)
