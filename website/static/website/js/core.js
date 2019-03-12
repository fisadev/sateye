var Alert = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
}

var sateye = {
    templates: {},
    dom: {},
    dashboard: null,

    initialize: function() {
        // initialize the whole client side app
        sateye.templates.alert = Handlebars.compile(document.getElementById("alert-template").innerHTML);
        sateye.templates.satellite = Handlebars.compile(document.getElementById("satellite-template").innerHTML);

        sateye.dom.alertsBar = $("#alerts-bar");
        sateye.dom.satelliteList = $("#satellite-list");

        sateye.map.initialize();
        sateye.satellites.initialize();
        sateye.locations.initialize();
        sateye.settings.initialize();

        sateye.loadDashboard();
    },

    showAlert: function(alertType, message) {
        // show an alert for the user to see
        var newAlertContent = sateye.templates.alert({
            alertType: alertType,
            message: message,
        });
        sateye.dom.alertsBar.append(newAlertContent);
    },

    showAlertsFromApiResponse: function(data) {
        // extract alerts that came in an api response
        for (alert in data.alerts) {
            sateye.showAlert(alert.type, alert.message);
        }
    },

    loadDashboard: function() {
        // load the user dashboard config from the server
        console.log("Requesting dashboards...");
        $.ajax({url: "/api/dashboards/", cache: false})
         .done(sateye.onDashboardsReceived);
    },

    onDashboardsReceived: function(data) {
        // when we receive response from the dashboards requeset
        console.log("Dashboards received from the server");
        // for now, we just get the first dashboard
        sateye.dashboard = data[0];
    },

    // date utilities

    addSeconds: function(date, seconds) {
        // add seconds to a julian date from cesium
        var newDate = new Cesium.JulianDate;
        Cesium.JulianDate.addSeconds(date, seconds, newDate);
        return newDate;
    },

    parseDate: function(iso8601string) {
        // parse an iso formatted date into a cesium julian date
        return Cesium.JulianDate.fromIso8601(iso8601string);
    },
}
