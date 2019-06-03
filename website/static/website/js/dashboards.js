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
        sateye.map.dashboardChanged();
    }

    self.createDashboard = function(dashboardData) {
        // create a new dashboard instance, parsing the json received from an api
        var dashboard = {
            id: dashboardData.id,
            name: dashboardData.name,
            satellites: {},
            locations: {},

            loadSatelliteConfigs: function() {
                // request all the satellite configs from this dashboard
                var dashboard = this;  
                $.ajax({url: "/api/dashboards/" + this.id + "/satellite_configs/"})
                 // we must define these as function(...) so "this" inside them is the dashboard
                 .done(function(data) {dashboard.onSatelliteConfigsReceived(data)}) 
                 .fail(function(data) {dashboard.onSatelliteConfigsFailed(data)});
            },

            onSatelliteConfigsReceived: function(data) {
                // create satellite instances for each satellite in the dashboard
                var satellites = {};
                for (let satelliteConfig of data) {
                    var satellite = sateye.satellites.createSatellite(satelliteConfig);
                    satellites[satellite.id] = satellite;
                }

                this.satellites = satellites;

                if (this === self.current) {
                    sateye.map.dashboardChanged();
                }
            },

            onSatelliteConfigsFailed: function() {
                sateye.showAlert(
                    sateye.Alert.ERROR, 
                    "Failed to load satellites from this dashboard. Try reloading the website, sorry!", 
                );
            },

            loadLocationConfigs: function() {
                // request all the location configs from this dashboard
                var dashboard = this;  
                $.ajax({url: "/api/dashboards/" + this.id + "/location_configs/"})
                 // we must define these as function(...) so "this" inside them is the dashboard
                 .done(function(data) {dashboard.onLocationConfigsReceived(data)}) 
                 .fail(function(data) {dashboard.onLocationConfigsFailed(data)});
            },

            onLocationConfigsReceived: function(data) {
                // create location instances for each location in the dashboard
                var locations = {};
                for (let locationConfig of data) {
                    var location = sateye.locations.createLocation(locationConfig);
                    locations[location.id] = location;
                }

                this.locations = locations;

                if (this === self.current) {
                    sateye.map.dashboardChanged();
                }
            },

            onLocationConfigsFailed: function() {
                sateye.showAlert(
                    sateye.Alert.ERROR, 
                    "Failed to load locations from this dashboard. Try reloading the website, sorry!", 
                );
            },
        }

        dashboard.loadSatelliteConfigs();
        dashboard.loadLocationConfigs();

        return dashboard;
    }

    return self;
}();
