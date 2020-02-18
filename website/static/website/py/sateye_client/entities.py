from datetime import datetime
from uuid import uuid4

from browser import ajax, window

from sateye_client.utils import iso_to_cesium_date


jsjson = window.JSON
cesium = window.Cesium


def init_params_from_jsobj(jsobj, init_fields):
    """
    Try to extract init params from a javascript object, usually the result of a JSON.parse.
    """
    return {field: jsobj[field]
            for field in init_fields
            if field in jsobj}


class Style:
    """
    Visual style for an object in the Dashboard.
    """
    def __init__(self, point_size=10, point_color="FFFF00", path_width=2, path_color="00FF00",
                 path_seconds_ahead=60 * 45, path_seconds_behind=60 * 10):
        self.point_size = point_size
        self.point_color = point_color
        self.path_width = path_width
        self.path_color = path_color
        self.path_seconds_ahead = path_seconds_ahead
        self.path_seconds_behind = path_seconds_behind

    @classmethod
    def from_jsobj(cls, jsobj):
        """
        Build a Style extracting data from a parsed api response.
        """
        fields = ("point_size point_color path_width path_color path_seconds_ahead "
                  "path_seconds_behind".split())
        init_params = init_params_from_jsobj(jsobj, fields)
        return cls(**init_params)


class Satellite:
    """
    A satellite that's part of a Dashboard.
    """
    def __init__(self, id=None, from_db=False, name="New satellite", description="New satellite",
                 norad_id=None, tle=None, tle_date=None, style=None):
        if from_db:
            assert id is not None

        if id is None:
            id = str(uuid4())
        if style is None:
            style = Style()

        # satellite data and configuration
        self.id = id
        self.from_db = from_db
        self.name = name
        self.description = description
        self.norad_id = norad_id
        self.tle = tle
        self.tle_date = tle_date
        self.style = style

        # dashboard working data, temporary, won't be saved
        self.path_positions = None
        self.path_start_date = None
        self.path_end_date = None
        self.on_new_path_callbacks = []

    def to_json(self):
        """
        Create a json serializable representation, to store in the dashboard config.
        """
        data = self.__dict__.copy()

        data["tle_date"] = data["tle_date"].isoformat()
        data["style"] = data["style"].to_json()

        data.pop("path_positions")
        data.pop("path_start_date")
        data.pop("path_end_date")
        data.pop("on_new_path_callbacks")

        return data

    @classmethod
    def from_jsobj(cls, jsobj):
        """
        Build a Satellite extracting data from a parsed api response.
        (this is meant to be used with the data from the json in the dashboard configs, and not
        from the satellites api itself)
        """
        fields = "id from_db name description norad_id tle tle_date style".split()
        init_params = init_params_from_jsobj(jsobj, fields)

        if "style" in init_params:
            init_params["style"] = Style.from_jsobj(init_params["style"])
        if "tle_date" in init_params:
            init_params["tle_date"] = datetime.fromisoformat(init_params["tle_date"])

        return cls(**init_params)

    def path_covers(self, start_date, end_date):
        """
        Check that the satellite has path predictions covering a specific range of time (usually
        asking from the current map date, plus X map seconds).
        """
        if self.path_positions:
            return self.path_start_date <= start_date and self.path_end_date >= end_date
        else:
            return False

    def get_path(self, start_date, end_date, timeout):
        """
        Get path predictions, to fill X seconds starting at a given date (usually asking from the
        current map date, plus X map seconds).
        """
        if self.tle:
            print("Requesting path for satellite", self.name)
            ajax.post(
                "/api/predict_path/",
                timeout=timeout,
                oncomplete=self.on_path_received,
                data=jsjson.stringify({
                    "satellite_id": self.id,
                    "tle": self.tle,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                }),
            )
        else:
            print("Can't request path for satellite", self.name, "because it has no TLE")

    def on_path_received(self, req):
        """
        When we receive the response with the requested path predictions.
        """
        print("Path received for satellite", self.name)

        if req.status in (0, 200):
            # store the new received path predictions
            path_data = jsjson.parse(req.text)

            self.path_start_date = datetime.fromisoformat(path_data["start_date"])
            self.path_end_date = datetime.fromisoformat(path_data["end_date"])

            # it would be nicer to have python instances instead, but this is waaay faster
            # (we store them in Cesium format, ready to be used in the map)
            self.path_positions = [
                (iso_to_cesium_date(position_data.at_date),
                 cesium.Cartesian3.fromDegrees(position_data.longitude,
                                               position_data.latitude,
                                               position_data.altitude))
                 for position_data in path_data.positions]

            # let everyone know we have new predictions
            for callback in self.on_new_path_callbacks:
                callback(self)
        else:
            # the requested path predictions failed
            print("Error getting path for satellite", self.name)
            print(req.text)


class Location:
    """
    A location that's part of a Dashboard.
    """
    def __init__(self, id=None, name="New location", description="New location", latitude=None,
                 longitude=None, altitude=None, style=None):
        if id is None:
            id = str(uuid4())
        if style is None:
            style = Style()

        self.id = id
        self.name = name
        self.description = description
        self.latitude = latitude
        self.longitude = longitude
        self.altitude = altitude
        self.style = style

    def to_json(self):
        """
        Create a json serializable representation, to store in the dashboard config.
        """
        data = self.__dict__.copy()

        data["position"] = data["position"].to_json()
        data["style"] = data["style"].to_json()

        return data

    @classmethod
    def from_jsobj(cls, jsobj):
        """
        Build a Location extracting data from a parsed api response.
        (this is meant to be used with the data from the json in the dashboard configs, and not
        from any locations api)
        """
        fields = "id name description latitude longitude altitude style".split()
        init_params = init_params_from_jsobj(jsobj, fields)

        if "style" in init_params:
            init_params["style"] = Style.from_jsobj(init_params["style"])

        return cls(**init_params)


class Dashboard:
    """
    A dashboard defining what is currently being presented (satellites, locations, etc).
    """
    def __init__(self, id=None, name="New dashboard", satellites=None, locations=None):
        if id is None:
            id = str(uuid4())
        if satellites is None:
            satellites = []
        if locations is None:
            locations = []

        self.id = id
        self.name = name
        self.satellites = satellites
        self.locations = locations

    def to_json(self):
        """
        Create a json serializable representation, to store in the server.
        """
        data = self.__dict__.copy()

        data["satellites"] = {satellite_id: satellite.to_json()
                              for satellite_id, satellite in data["satellites"].items()}
        data["locations"] = {location_id: location.to_json()
                             for location_id, location in data["locations"].items()}

        return data

    @classmethod
    def from_jsobj(cls, jsobj):
        """
        Build a Dashboard extracting data from a parsed api response.
        jsobj will be an object parsed from javascript.
        """
        fields = "id name".split()
        init_params = init_params_from_jsobj(jsobj, fields)

        if "config" in jsobj:
            if "satellites" in jsobj.config:
                init_params["satellites"] = {
                    satellite_data.id: Satellite.from_jsobj(satellite_data)
                    for satellite_data in jsobj.config.satellites
                }
            if "locations" in jsobj.config:
                init_params["locations"] = {
                    location_data.id: Location.from_jsobj(location_data)
                    for location_data in jsobj.config.locations
                }

        return cls(**init_params)

    @classmethod
    def get_from_server(cls, dashboard_id, callback):
        """
        Load a user dashboard config from the server.
        """
        print("Requesting dashboard", dashboard_id, "...")
        def on_dashboard_received(req):
            """
            Before calling the specified callback, parse the response and build a dashboard
            instance.
            """
            if req.status in (0, 200):
                print("Dashboard received from the server")
                dashboard = cls.from_jsobj(jsjson.parse(req.text))
                callback(dashboard)
            else:
                print("Error reading the dashboard from the server")

        ajax.get("/api/dashboards/{}/".format(dashboard_id),
                 oncomplete=on_dashboard_received)

    def save_to_server(self):
        """
        Save the dashboard config to the server.
        """
        print("WARNING: saving dashboards isn't yet implemented")
