from datetime import timedelta

from django.conf import settings
from django.db import models

from website.utils import get_predictor_from_tle_lines


class Satellite(models.Model):
    """
    A specific satellite in orbit, that Sateye can display and track.
    """
    name = models.CharField(max_length=100)
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
        # get a predictor that is, on average, closest to the dates we will be using in this
        # period of time
        period_length = end_date - start_date
        period_center = start_date + period_length / 2
        predictor = self.get_predictor(for_date=period_center)

        step = timedelta(seconds=step_seconds)

        # iterate over time, returning the position at each moment
        current_date = start_date
        while current_date <= end_date:
            yield predictor.get_position(current_date).position_llh
            current_date += step

    def __str__(self):
        return 'Satellite: {}'.format(self.name)


class TLE(models.Model):
    """
    Orbital information from a specific satellite at a specific moment in time.
    """
    satellite = models.ForeignKey(Satellite, on_delete=models.CASCADE, related_name='tles')
    at = models.DateTimeField()
    lines = models.TextField()  # the actual two line element

    def __str__(self):
        return 'TLE at {}'.format(self.at)


class Location(models.Model):
    """
    A specific point location on Earth.
    """
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True,
                              blank=True, related_name='locations')
    name = models.CharField(max_length=100, null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)
    alt = models.FloatField(null=True, blank=True)

    def __str__(self):
        return 'Location: {}'.format(self.name)
