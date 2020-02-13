sateye.dashboards = function() {
    var self = {};
    self.current = null;
    
    self.onDashboardChangedCallbacks = [];

    self.initialize = function() {
        // always create an empty dashboard, just in case
        self.setCurrentDashboard(self.createDashboard());
    }

    self.loadDashboard = function(dashboardId) {
        // load the user dashboard config from the server
        // if the dashboard_id isn't specified, load the first dashboard available
        console.log("Requesting dashboard...");

        $.ajax({url: "/api/dashboards/" + dashboardId.toString() + "/", cache: false})
         .done(self.onDashboardReceived);
    }

    self.onDashboardReceived = function(data) {
        // when we receive response from the single dashboard requeset
        console.log("Dashboard received from the server");
        self.setCurrentDashboard(self.createDashboard(data));
    }

    self.setCurrentDashboard = function(dashboard) {
        // do all the stuff required to set the new dashboard
        self.current = dashboard;
        self.broadcastDashboardChange();
    }

    self.broadcastDashboardChange = function() {
        // inform anyone interested, that the current dashboard has changed 
        // (either a new dashboard, or changes in the data from the current dashboard)
        for (let dashboardChangedCallback of self.onDashboardChangedCallbacks) {
            dashboardChangedCallback();
        }
    }

    self.createDashboard = function(dashboardData) {
        // create a new dashboard instance, parsing the json received from an api
        var dashboard = {
            id: null,
            name: "New dashboard",
            satellites: {},
            locations: {},

            saveToServer: function() {
                // save the dashboard config to the server db
                console.log('WARNING: dashboard saving not implemented');
            }
        }

        // if specified, update the dashboard with the data
        if (dashboardData) {
            dashboard = Object.assign(dashboard, dashboardData);
            dashboard.config = undefined;
        }

        var rawConfig = {
            satellites: [],
            locations: [],
        }
        if (dashboardData) {
            try {
                rawConfig = JSON.parse(dashboardData.config);
            } catch(error) {
                console.log("Error dashboard config:");
                console.log(error);
            }
        }

        // create satellite instances for each satellite in the dashboard
        try {
            if (rawConfig.satellites) {
                for (let satelliteConfig of rawConfig.satellites) {
                    var satellite = sateye.satellites.createSatellite(satelliteConfig);
                    dashboard.satellites[satellite.id] = satellite;
                }
            }
        } catch(error) {
            console.log("Error reading satellites from dashboard config:");
            console.log(error);
        }

        // create location instances for each location in the dashboard
        try {
            if (rawConfig.locations) {
                for (let locationConfig of rawConfig.locations) {
                    var location = sateye.locations.createLocation(locationConfig);
                    dashboard.locations[location.id] = location;
                }
            }
        } catch(error) {
            console.log("Error reading locations from dashboard config:");
            console.log(error);
        }

        return dashboard;
    }

    return self;
}();
