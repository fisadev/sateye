import sys

from satellite_tle import fetch_tle_from_celestrak


lines = fetch_tle_from_celestrak(int(sys.argv[1]))
print('\n'.join(lines))
