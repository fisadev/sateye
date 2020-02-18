from sateye_client.entities import Dashboard


class App:
    """
    The Sateye client side app itself. It also depends on having a BgWorker instance running as a
    web worker.
    """
    def __init__(self):
        """
        Initialize the client side app of Sateye.
        """
        self.dashboard = None
        self.on_dashboard_changed_callbacks = []

        print("Initializing Sateye app...")

        from sateye_client.map_ui import MapUI
        from sateye_client.satellites_ui import SatellitesUI
        from sateye_client.locations_ui import LocationsUI
        # from sateye_client.passes import initialize_passes
        from sateye_client.dashboards_ui import DashboardsUI

        print("Initializing map UI...")
        self.map_ui = MapUI(self)
        print("Map UI initialized")

        print("Initializing satellites UI...")
        self.satellites_ui = SatellitesUI(self)
        print("Satellites UI initialized")

        print("Initializing locations UI...")
        self.locations_ui = LocationsUI(self)
        print("Locations UI initialized")

        print("Initializing dashboards UI...")
        self.locations_ui = LocationsUI(self)
        print("Dashboards UI initialized")

        # initialize_passes()

        print("Sateye app initialized!")

        # set callbacks that glue ui modules between each other
        self.on_dashboard_changed_callbacks.append(
            self.map_ui.on_dashboard_changed
        )

    def set_current_dashboard(self, dashboard):
        """
        Set the current dashboard that is being used in the app.
        """
        if isinstance(dashboard, int):
            # received an id. Get the dashboard from the server, and re-call this function with
            # the actual dashboard
            Dashboard.get_from_server(dashboard, self.set_current_dashboard)
        else:
            # received an actual dashboard, set it and let everybody know
            self.dashboard = dashboard

            for callback in self.on_dashboard_changed_callbacks:
                callback()
