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
        sateye.dashboards.current = sateye.dashboards.createDashboard(data[0]);
    },

    onDashboardReceived: function(data) {
        // when we receive response from the single dashboard requeset
        console.log("Dashboard received from the server");
        sateye.dashboards.current = sateye.dashboards.createDashboard(data);
    },

    createDashboard: function(dashboardData) {
        var satellites = [];
        // create satellite instances for each satellite in the dashboard
        for (let satelliteConfig of dashboardData.satellite_configs) {
            var satellite = sateye.satellites.createSatellite(satelliteConfig.satellite, satelliteConfig);
            satellites.push(satellite);
        }

        return {
            id: dashboardData.id,
            name: dashboardData.name,
            satellites: satellites,
        }
    },
}
