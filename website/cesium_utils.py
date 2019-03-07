from datetime import datetime


DATE_FORMAT = "%Y-%m-%dT%H:%MZ"


def generate_path_data(satellite, start_date, end_date, positions):
    """
    Get path information for a satellite, in the format that's useful for cesium.
    """
    # cesium expects all the positions in a single list with this format:
    # [delta_seconds1, lon1, lat1, alt1, delta_seconds2, lon2, lat2, alt2, ...]
    joined_positions = []
    for current_date, position in positions:
        joined_positions.extend((
            current_date.strftime(DATE_FORMAT),
            position[1],  # lon
            position[0],  # lat
            position[2] * 1000,  # alt
        ))

    cesium_czml = [
        {
            "id": "document",
            "name": "Sateye CZML",
            "version": "1.0",
        },
        {
            "id": "Sateye.Satellite:{}".format(satellite.pk),
            "name": satellite.name,
            "description": "<!--HTML-->\r\n<h2>{}</h2><p>{}</p>".format(
                satellite.name,
                satellite.description,
            ),
            "availability": "{}/{}".format(datetime.min.strftime(DATE_FORMAT),
                                           datetime.max.strftime(DATE_FORMAT)),
            "point": {
                "show": True,
                "pixelSize": 15,
                "color": {
                    "rgba": [255, 0, 0, 255],
                },
            },
            "path": {
                "show": True,
                "width": 1,
                "material": {
                    "solidColor": {
                        "color": {
                            "rgba": [0, 255, 0, 255]
                        }
                    }
                },
                "resolution": 120,
                "leadTime": 16200,  # show only for the next 3 orbits. (90' * 60") * 3
                "trailTime": 600,
            },
            "position": {
                "interpolationAlgorithm": "LAGRANGE",
                "interpolationDegree": 5,
                "referenceFrame": "INERTIAL",
                "epoch": start_date.strftime(DATE_FORMAT),
                "cartographicDegrees": joined_positions,
            },
        }
    ]

    return cesium_czml
