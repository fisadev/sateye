from django.core.management.base import BaseCommand

from website.models import Satellite
from website.orbits import get_tles, get_tle_date
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

        sates_to_update = []
        for sate in satellites:
            new_tle = tles.get(sate.norad_id, sate.tle)
            if new_tle != sate.tle:
                sate.tle = new_tle
                sate.tle_date = get_tle_date(new_tle)
                sates_to_update.append(sate)

        self.stdout.write("Found {} new tles".format(len(sates_to_update)))

        if sates_to_update:
            self.stdout.write("Updating satellites TLEs in the database...")
            Satellite.objects.bulk_update(sates_to_update, ['tle', 'tle_date'])
            self.stdout.write(self.style.SUCCESS("Satellites updated!"))
