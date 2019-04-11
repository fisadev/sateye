sateye.dashboards = function() {
    var self = {};
    self.current = null;

    self.initialize = function() {
        self.loadDashboard();
    }

    self.loadDashboard = function(dashboardId) {
        // load the user dashboard config from the server
        // if the dashboard_id isn't specified, load the first dashboard available
        console.log("Requesting dashboards...");

        // temporal hack, until we have some kind of dashboard picker and the logic gets separated
        if (dashboardId === undefined) {
            $.ajax({url: "/api/dashboards/", cache: false})
             .done(self.onDashboardsReceived);
        } else {
            $.ajax({url: "/api/dashboards/" + dashboardId.toString() + "/", cache: false})
             .done(self.onDashboardReceived);
        }
    }

    self.onDashboardsReceived = function(data) {
        // when we receive response from the dashboards list requeset
        console.log("Dashboards received from the server");
        // if no id was specified, just get the first dashboard
        self.setCurrentDashboard(self.createDashboard(data[0]));
    }

    self.onDashboardReceived = function(data) {
        // when we receive response from the single dashboard requeset
        console.log("Dashboard received from the server");
        self.setCurrentDashboard(self.createDashboard(data));
    }

    self.setCurrentDashboard = function(dashboard) {
        // do all the stuff required to set the new dashboard
        self.current = dashboard;
        sateye.map.onNewDashboard(dashboard);
        sateye.satellites.onNewSatellites(dashboard.satellites);
    }

    self.createDashboard = function(dashboardData) {
        // create a new dashboard instance, parsing the json received from an api

        // create satellite instances for each satellite in the dashboard
        var satellites = [];
        for (let satelliteConfig of dashboardData.satellite_configs) {
            var satellite = sateye.satellites.createSatellite(satelliteConfig);
            satellites.push(satellite);
        }
        // create location instances for each location in the dashboard
        var locations = [];
        for (let locationConfig of dashboardData.location_configs) {
            var location = sateye.locations.createLocation(locationConfig);
            locations.push(location);
        }

        return {
            id: dashboardData.id,
            name: dashboardData.name,
            satellites: satellites,
            locations: locations,

            getSatellite: function(satelliteId) {
                // get a satellite from the dashboard, by id
                // if the satellite is not found, returns null
                for (let satellite of this.satellites) {
                    if (satellite.id === satelliteId) {
                        return satellite;
                    }
                }
                return null;
            },

            getLocation: function(locationId) {
                // get a location from the dashboard, by id
                // if the location is not found, returns null
                for (let location of this.locations) {
                    if (location.id === locationId) {
                        return location;
                    }
                }
                return null;
            }
        }
    }

    return self;
}();
