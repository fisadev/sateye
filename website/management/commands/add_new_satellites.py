from django.core.management.base import BaseCommand

from website.models import Satellite
from website.orbits import get_tles, split_tle
from website.utils import get_logger


logger = get_logger()


class Command(BaseCommand):
    """
    Management command to find new satellites from Celestrak, and add them to the database.
    """
    help = "Add satellites from Celestrak that aren't present in the database"

    def handle(self, *args, **options):
        known_ids = set(Satellite.objects.values_list('norad_id', flat=True))
        tles = get_tles()
        new_sates = []

        for norad_id, tle in tles.items():
            title, _, _ = split_tle(tle)

            if norad_id not in known_ids:
                new_sates.append(
                    Satellite(
                        name=title.strip() or "Unknown",
                        norad_id=norad_id,
                        tle=tle,
                    )
                )

        self.stdout.write("Found {} new satellites".format(len(new_sates)))

        if new_sates:
            self.stdout.write("Inserting new satellites into the database...")
            Satellite.objects.bulk_create(new_sates)
            self.stdout.write(self.style.SUCCESS("New satellites saved!"))
