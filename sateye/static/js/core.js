var Alert = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
}

var sateye = {
    templates: {},
    dom: {},
    userData: null,
    userDataVersion: 0.1,

    initialize: function() {
        // initialize the whole client side app
        sateye.templates.alert = Handlebars.compile(document.getElementById("alert-template").innerHTML);

        sateye.dom.alertsBar = $("#alerts-bar");

        sateye.map.initialize();
        sateye.satellites.initialize();
        sateye.locations.initialize();
        sateye.settings.initialize();

        sateye.loadUserData();
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

    loadUserData: function() {
        // load the user data from the server
        console.log("Requesting user data...");
        $.ajax({url: "/api/user_data/", cache: false})
         .done(sateye.onUserDataReceived);
    },

    onUserDataReceived: function(data) {
        // when we receive response from the user data requeset
        console.log("User data received from the server");
        sateye.showAlertsFromApiResponse(data);
        sateye.userData = data.payload;
        console.log("User data loaded:");
        console.log(sateye.userData);
    },

    saveUserData: function() {
        // save the user data to the server
        console.log("Posting user data...");
        $.ajax({type: "POST", url: "/api/user_data/", cache: false})
         .done(sateye.onUserDataSaved);
    },

    onUserDataSaved: function(data) {
        // when we receive response from the user data save post
        console.log("User data saved to the server");
        sateye.showAlertsFromApiResponse(data);
    },
}
