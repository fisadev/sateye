from django.core.management.base import BaseCommand

from website.models import Satellite
from website.orbits import get_tles
from website.utils import get_logger


logger = get_logger()


class Command(BaseCommand):
    """
    Management command to update TLEs for the db satellites.
    """
    help = "Update the TLEs of the db stored satellites"

    def add_arguments(self, parser):
        parser.add_argument('norad_ids', nargs='*', type=int)

    def handle(self, *args, **options):
        only_norad_ids = options.get('norad_ids')

        if only_norad_ids:
            satellites = Satellite.objects.filter(norad_id__in=only_norad_ids)
        else:
            satellites = Satellite.objects.all()

        tles = get_tles()

        for sate in satellites:
            if sate.norad_id in tles:
                sate.tle = tles[sate.norad_id]
                sate.save()
                self.stdout.write(self.style.SUCCESS(
                    "Updated TLE for satellite {} (norad_id={})".format(sate.name, sate.norad_id)
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    "No TLE found for satellite {} (norad_id={})".format(sate.name, sate.norad_id)
                ))
