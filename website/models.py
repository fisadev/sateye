from datetime import timedelta

from django.conf import settings
from django.db import models

from orbit_predictor import locations as op_locations

from website.utils import get_predictor_from_tle_lines, ensure_naive


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

    def get_predictor(self, for_date=None, precise=False):
        """
        Build an orbit predictor for the satellite, using its known TLEs.
        """
        assert self.tles.exists()
        if for_date:
            best_tle = self.get_closest_tle(for_date)
        else:
            best_tle = self.tles.order_by('at').last()

        return get_predictor_from_tle_lines(best_tle.lines.split('\n'), precise=precise)

    def predict_path(self, start_date, end_date, step_seconds=60):
        """
        Predict the positions of a satellite during a period of time, with certain step precision.
        """
        assert start_date < end_date
        # get a predictor that is, on average, closest to the dates we will be using in this
        # period of time
        period_length = end_date - start_date
        period_center = start_date + period_length / 2
        predictor = self.get_predictor(for_date=period_center, precise=True)

        step = timedelta(seconds=step_seconds)

        # iterate over time, returning the position at each moment
        current_date = start_date
        while current_date <= end_date:
            # the predictor works with naive dates only
            naive_current_date = ensure_naive(current_date)
            yield current_date, predictor.get_position(naive_current_date).position_llh
            current_date += step

    def predict_passes(self, location, start_date, end_date):
        """
        Predict the passes of a satellite over a location on TCA between two dates.
        """
        location = location.get_op_location()
        predictor = self.get_predictor(precise=True)

        for pass_ in predictor.passes_over(location, start_date):
            if pass_.los > end_date:
                break

            yield pass_

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
