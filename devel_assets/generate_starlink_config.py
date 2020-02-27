import json

import requests


tles_url = "https://celestrak.com/NORAD/elements/starlink.txt"

tles_response = requests.get(tles_url)
all_tle_lines = tles_response.content.decode('utf-8').split('\r\n')

raw_sates = []
for sate_index in range(int(len(all_tle_lines) / 3)):
    lines_start_at = sate_index * 3
    name = all_tle_lines[lines_start_at].strip()
    tle = '{}\r\n{}'.format(*all_tle_lines[lines_start_at + 1:lines_start_at + 3])

    if 'STARLINK' in name:
        raw_sates.append((name, tle))


satellites = []
for name, tle in raw_sates:
    sate = {
        "id": len(satellites),
        "from_db": False,
        "name": name,
        "norad_id": tle.split()[1],
        "description": name,
        "tle": tle,
        "style": {
            "point_size": 5,
            "point_color": "#00FF00",
            "path_color": "#CCFF00",
            "path_width": 1,
            "path_seconds_ahead": 5000,
            "path_seconds_behind": 600
        }
    }
    satellites.append(sate)

full_config = {
    "satellites": satellites,
    "locations": [
        {
            "id": 1,
            "name": "Rafaela",
            "description": "Ciudad en provincia de Santa Fe",
            "latitude": -31.2526,
            "longitude": -61.4916,
            "altitude": 90.0
        }
    ]
}

print(json.dumps(full_config, indent=2))
