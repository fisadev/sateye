from datetime import timedelta
import pytz

from django.conf import settings
from django.db import models
from django.utils.timezone import make_aware

from orbit_predictor import locations as op_locations
from orbit_predictor.sources import get_predictor_from_tle_lines

from website.utils import ensure_naive, Pass


class Satellite(models.Model):
    """
    A specific satellite in orbit, that Sateye can display and track.
    """
    name = models.CharField(max_length=100)
    norad_id = models.IntegerField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True,
                              blank=True, related_name='satellites')

    def get_closest_tle(self, to_date):
        """
        Get the TLE that is closest to the specified date. If no TLE is found, then returns None.
        """
        closest_tle = None

        try:
            before = self.tles.filter(at__lte=to_date).order_by('at').last()
        except TLE.DoesNotExist as err:
            before = None

        try:
            after = self.tles.filter(at__gt=to_date).order_by('at').first()
        except TLE.DoesNotExist as err:
            after = None

        if before and not after:
            # only past tles found, return the newest one
            closest_tle = before
        elif after and not before:
            # only future tles found, return the oldest one
            closest_tle = after
        else:
            # past and future tles found, return the one that is closest
            diff_before = to_date - before
            diff_after = after - to_date

            if diff_before < diff_after:
                closest_tle = before
            else:
                closest_tle = after

        return closest_tle

    def get_predictor(self, for_date=None):
        """
        Build an orbit predictor for the satellite, using its known TLEs.
        """
        assert self.tles.exists()
        if for_date:
            best_tle = self.get_closest_tle(for_date)
        else:
            best_tle = self.tles.order_by('at').last()

        return get_predictor_from_tle_lines(best_tle.lines.split('\n'))

    def predict_path(self, start_date, end_date, step_seconds=60):
        """
        Predict the positions of a satellite during a period of time, with certain step precision.
        """
        assert start_date < end_date
        # get a predictor that is, on average, closest to the dates we will be using in this
        # period of time
        period_length = end_date - start_date
        period_center = start_date + period_length / 2
        predictor = self.get_predictor(for_date=period_center)

        step = timedelta(seconds=step_seconds)

        # iterate over time, returning the position at each moment
        current_date = start_date
        while current_date <= end_date:
            # the predictor works with naive dates only
            naive_current_date = ensure_naive(current_date)
            lat, lon, elevation_km = predictor.get_position(naive_current_date).position_llh
            yield current_date, (lat, lon, elevation_km * 1000)
            current_date += step

    def predict_passes(self, location, start_date, end_date, min_tca_elevation=None,
                       min_sun_elevation=None):
        """
        Predict the passes of a satellite over a location on TCA between two dates.
        """
        start_date = ensure_naive(start_date)
        end_date = ensure_naive(end_date)

        op_location = location.get_op_location()
        predictor = self.get_predictor()

        # this is done like this, because orbit_predictor interprets max_elevation_gt=None as
        # an angle and explodes
        extra_filters = {}
        if min_tca_elevation is not None:
            extra_filters['max_elevation_gt'] = min_tca_elevation

        passes_iterator = predictor.passes_over(op_location, start_date, limit_date=end_date,
                                                **extra_filters)

        for pass_ in passes_iterator:
            # TODO calculate sun elevation, and filter passes by it
            yield Pass(
                satellite=self,
                location=location,
                aos=make_aware(pass_.aos, timezone=pytz.utc),
                los=make_aware(pass_.los, timezone=pytz.utc),
                tca=make_aware(pass_.max_elevation_date, timezone=pytz.utc),
                tca_elevation=pass_.max_elevation_deg,
                sun_elevation=None,  # TODO return calculated sun elevation
            )

    @property
    def newest_tle(self):
        """
        Get the newest tle.
        """
        if self.tles.exists():
            return self.tles.order_by('at').last()

    def __str__(self):
        return self.name


class TLE(models.Model):
    """
    Orbital information from a specific satellite at a specific moment in time.
    """
    satellite = models.ForeignKey(Satellite, on_delete=models.CASCADE, related_name='tles')
    at = models.DateTimeField()
    lines = models.TextField()  # the actual two line element

    def __str__(self):
        return 'Recorded at {}'.format(self.at)


class Location(models.Model):
    """
    A specific point location on Earth.
    """
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True,
                              blank=True, related_name='locations')
    name = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    elevation = models.FloatField(null=True, blank=True)

    def get_op_location(self):
        """
        Build a orbit_predictor.locations.Location object from this model instance.
        """
        return op_locations.Location(self.name, self.latitude, self.longitude, self.elevation)

    def __str__(self):
        return '{} at ({}, {}) {} mts'.format(self.name, self.latitude, self.longitude,
                                              self.elevation)


class Dashboard(models.Model):
    """
    A customization of satellites to display, and how to display them.
    """
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name='dashboards')

    def __str__(self):
        return self.name


class DashboardSatelliteConfig(models.Model):
    """
    A config of a satellite being displayed at a dashboard.
    """
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE,
                                  related_name='satellite_configs')
    satellite = models.ForeignKey(Satellite, on_delete=models.CASCADE,
                                  related_name='dashboard_configs')
    point_size = models.IntegerField(default=15)
    point_color = models.CharField(max_length=100, default="#FF0000")

    path_width = models.IntegerField(default=1)
    path_color = models.CharField(max_length=100, default="#00FF00")
    path_seconds_ahead = models.IntegerField(default=30 * 60)
    path_seconds_behind = models.IntegerField(default=30 * 60)

    def __str__(self):
        return "{} in {}".format(self.satellite.name, self.dashboard.name)


class DashboardLocationConfig(models.Model):
    """
    A config of a location being displayed at a dashboard.
    """
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE,
                                  related_name='location_configs')
    location = models.ForeignKey(Location, on_delete=models.CASCADE,
                                 related_name='dashboard_configs')
    point_size = models.IntegerField(default=15)
    point_color = models.CharField(max_length=100, default="#FFFF00")

    def __str__(self):
        return "{} in {}".format(self.location.name, self.dashboard.name)
