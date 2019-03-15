sateye.dashboards = {
    current: null,

    initialize: function() {
        sateye.dashboards.loadDashboard();
    },

    loadDashboard: function(dashboardId) {
        // load the user dashboard config from the server
        // if the dashboard_id isn't specified, load the first dashboard available
        console.log("Requesting dashboards...");

        // temporal hack, until we have some kind of dashboard picker and the logic gets separated
        if (dashboardId === undefined) {
            $.ajax({url: "/api/dashboards/", cache: false})
             .done(sateye.dashboards.onDashboardsReceived);
        } else {
            $.ajax({url: "/api/dashboards/" + dashboardId.toString() + "/", cache: false})
             .done(sateye.dashboards.onDashboardReceived);
        }
    },

    onDashboardsReceived: function(data) {
        // when we receive response from the dashboards list requeset
        console.log("Dashboards received from the server");
        // if no id was specified, just get the first dashboard
        sateye.dashboards.setCurrentDashboard(sateye.dashboards.createDashboard(data[0]));
    },

    onDashboardReceived: function(data) {
        // when we receive response from the single dashboard requeset
        console.log("Dashboard received from the server");
        sateye.dashboards.setCurrentDashboard(sateye.dashboards.createDashboard(data));
    },

    setCurrentDashboard: function(dashboard) {
        // do all the stuff required to set the new dashboard
        sateye.dashboards.current = dashboard;
        sateye.map.onNewDashboard(dashboard);
    },

    createDashboard: function(dashboardData) {
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
        }
    },
}
