import json

import requests


# what about https://celestrak.com/NORAD/elements/starlink.txt ?
# it seems to have more satellites than the ones returned by active.txt

sates_response = requests.get("http://localhost:8000/api/satellites/")
sates_data = sates_response.json()


satellites = []
for sate in sates_data:
    if 'STARLINK' in sate['name']:
        sate = {
            "norad_id": sate['norad_id'],
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
