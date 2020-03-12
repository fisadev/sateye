import json

from website.orbits import get_tles, split_tle


tles = get_tles("https://celestrak.com/NORAD/elements/starlink.txt")

satellites = []
for norad_id, tle in tles.items():
    title, _, _ = split_tle(tle)

    if 'STARLINK' in title:
        sate = {
            "norad_id": norad_id,
            "from_db": True,
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
