from datetime import timedelta

from browser import window

from sateye_client.utils import cesium_date_to_datetime, hex_to_cesium_color, iso_to_cesium_date


jq = window.jQuery
cesium = window.Cesium


class MapUI:
    """
    All the logic that handles the map related part of the UI of Sateye.
    """
    def __init__(self, app):
        self.app = app
        self.viewer = None

        # chunking configs. More info at docs/prediction_chunks.rst
        # how often do we check if we need to refresh predictions?
        self.predictions_refresh_real_seconds = 5
        # how many real seconds do we want to get on each prediction?
        self.predictions_chunk_real_seconds = 30 * 60
        # how many real seconds before we run out of predictions should fire a new request for
        # predictions?
        self.predictions_too_low_threshold_real_seconds = 15 * 60

        # initialize the map module
        self.configure_cesium_map()

        # references to the dom
        self.night_shadow_input = jq("#night-shadow-input")
        self.map_date_picker = jq("#map-date-picker")
        self.go_to_date_button = jq("#go-to-date")

        # assign event handlers
        self.go_to_date_button.on("click", self.on_go_to_date_click)
        self.night_shadow_input.on("change", self.on_night_shadow_change)
        self.on_night_shadow_change()

    def configure_cesium_map(self):
        """
        Configure the cesium map.
        """
        cesium.Ion.defaultAccessToken = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMmUxZTgyMy0xYTE1LTQzOGUtOTZjMS1jYj"
            "czMzU0ZWI5ZWMiLCJpZCI6OTYyNCwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU1NDUwMjE2N30.i"
            "ukQuH2ydaMGoXvmeX7_Q9H7ARwaqPt-qSTGcubjhIQ"
        )

        cesium_config = {
            "homeButton": False,
            "navigationInstructionsInitiallyVisible": False,
            "sceneMode": cesium.SceneMode.SCENE2D,
            "fullscreenButton": False,
            "shouldAnimate": True,
        }
        self.viewer = cesium.Viewer.new("main-map", cesium_config)

        # center on 0,0 with enough distance to see the whole planet
        center = cesium.Cartesian3.fromDegrees(0, 0)
        self.viewer.camera.setView({"destination": center})

        # every some time, ensure we have paths for each satellite
        #self.viewer.clock.onTick.addEventListener(self.on_map_tick)
        window.setInterval(
            self.ensure_enough_predictions,
            (self.predictions_refresh_real_seconds - 1) * 1000,
        )

        # remove fog and ground atmosphere on 3d globe
        self.viewer.scene.fog.enabled = False
        self.viewer.scene.globe.showGroundAtmosphere = False

    def on_map_tick(self, clock):
        """
        The map clock moved one tick.
        """
        # TODO
        pass

    def on_go_to_date_click(self, e):
        """
        Go to the selected date.
        """
        self.viewer.clock.currentTime = iso_to_cesium_date(self.map_date_picker.val() + "Z")

    def real_to_map_seconds(self, real_seconds):
        """
        Convert real seconds to map seconds, because the map can be moving at a different speed.
        """
        clock = self.viewer.clock
        return clock.clockStep * clock.multiplier * real_seconds

    def on_dashboard_changed(self):
        """
        Called when the current dashboard suffers any change.
        """
        self.clear_map_data()
        # satellites don't need to be added here, because ensure_enough_predictions will take care
        # of automatically adding them in a few seconds
        if self.app.dashboard:
            self.add_locations(self.app.dashboard.locations)

    def clear_map_data(self):
        """
        Remove all data from the map.
        """
        self.viewer.entities.removeAll()

    def add_locations(self, locations):
        """
        Add new locations to the map.
        """
        for location in locations.values():
            location_entity = {
                "id": "Sateye.Location:{}".format(location.id),
                "name": location.name,
                "description": "<!--HTML-->\r\n<p>{}</p>".format(location.description),
                "point": {
                    "show": True,
                    "pixelSize": location.style.point_size,
                    "color": hex_to_cesium_color(location.style.point_color),
                    "heightReference": cesium.HeightReference.CLAMP_TO_GROUND,
                },
                "position": cesium.Cartesian3.fromDegrees(location.position.longitude,
                                                          location.position.latitude),
            }

            self.viewer.entities.add(location_entity)

    def ensure_enough_predictions(self):
        """
        Ensure the map has enough info to display paths for shown satellites.
        """
        if not self.app.dashboard:
            return

        # if we have less than X real seconds of predictions left, then ask for Y predicted
        # seconds (more info at docs/prediction_chunks.rst)
        for satellite in self.app.dashboard.satellites.values():
            current_date = cesium_date_to_datetime(self.viewer.clock.currentTime)

            # we should ensure we have predictions enough to cover the time between the current
            # date and current_date + self.predictions_too_low_threshold_real_seconds
            map_seconds_until_end = self.real_to_map_seconds(
                self.predictions_too_low_threshold_real_seconds
            )
            ensure_predictions_until = current_date + timedelta(seconds=map_seconds_until_end)

            if not satellite.path_covers(current_date, ensure_predictions_until):
                # ensure we will know when the predictions are received
                if self.update_satellite_in_map not in satellite.on_new_path_callbacks:
                    satellite.on_new_path_callbacks.append(self.update_satellite_in_map)

                # ask for the predictions
                map_seconds_arround = self.real_to_map_seconds(self.predictions_chunk_real_seconds)
                start_date = current_date - timedelta(seconds=map_seconds_arround)
                end_date = current_date + timedelta(seconds=map_seconds_arround)

                satellite.get_path(
                    start_date,
                    end_date,
                    self.predictions_refresh_real_seconds * 1000,  # used as timeout
                )

    def build_or_create_satellite_entity(self, satellite):
        """
        Build a cesium entity to display the satellite and its path in the map, or return an
        existing one if it's already there.
        """
        satellite_map_id = "Sateye.Satellite:{}".format(satellite.id)
        satellite_entity = self.viewer.entities.getById(satellite_map_id)

        # TODO will getById return an undefined? be a None? fail?
        if not satellite_entity:
            satellite_entity = self.viewer.entities.add({
                "id": satellite_map_id,
                "availability": cesium.TimeIntervalCollection.new(),
            })

        return satellite_entity

    def update_satellite_in_map(self, satellite):
        """
        Update the display data for a satellite shown in the map, based on its path predictions
        this will even add the satellite for the map if it wasn't already there.
        """
        satellite_entity = self.build_or_create_satellite_entity(satellite)

        # general satellite data
        satellite_entity.name = satellite.name
        satellite_entity.description = "<!--HTML-->\r\n<p>{}</p>".format(satellite.description)

        # show satellite in this specific interval
        # (we only trust the latest predictions, stuff like new tles could invalidate previous
        # ones)
        satellite_entity.availability.removeAll()
        satellite_entity.availability.addInterval(cesium.TimeInterval.new({
            "start": satellite.path_start_date.isoformat(),
            "stop": satellite.path_end_date.isoformat(),
        }))

        # a point in the satellite position, that moves over time
        satellite_entity.point = cesium.PointGraphics.new({
            "show": True,
            "pixelSize": satellite.style.point_size,
            "color": hex_to_cesium_color(satellite.style.point_color),
        })

        # satellite positions over time
        position_property = cesium.SampledPositionProperty.new()
        for position in satellite.path_positions:
            position_property.addSample(
                iso_to_cesium_date(position.at_date.isoformat()),
                cesium.Cartesian3.fromDegrees(
                    position.longitude,
                    position.latitude,
                    position.altitude,
                ),
            )

        satellite_entity.position = position_property

        # path predicted behind and ahead the satellite
        satellite_entity.path = cesium.PathGraphics.new({
            "show": True,
            "width": satellite.style.path_width,
            "material": cesium.ColorMaterialProperty.new(
                hex_to_cesium_color(satellite.style.path_color)
            ),
            "resolution": 120,
            "leadTime": satellite.style.path_seconds_ahead,
            "trailTime": satellite.style.path_seconds_behind,
        })

    def on_night_shadow_change(self, e=None):
        """
        On input change, decide wether to show or not the night shadow.
        """
        self.viewer.scene.globe.enableLighting = self.night_shadow_input.prop("checked") is True
