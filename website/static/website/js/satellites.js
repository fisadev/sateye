sateye.satellites = {
    dom: {},

    initialize: function() {
        // references to the dom
        sateye.satellites.dom.satellitesList = $("#satellites-list");
        sateye.satellites.dom.satellitesModal = $("#satellites-modal");
        sateye.satellites.dom.existingSatellitesForm = $("#existing-satellites-form");
        sateye.satellites.dom.existingSatellitesList = $("#existing-satellites-list");
        sateye.satellites.dom.filterSatellitesInput = $("#filter-satellites-input");
        sateye.satellites.dom.createSatelliteForm = $("#create-satellite-form");

        // assign event handlers
        sateye.satellites.dom.satellitesModal.on("show.bs.modal", sateye.satellites.onSatellitesModalShown);
        sateye.satellites.dom.existingSatellitesForm.on("show.bs.collapse", sateye.satellites.onExistingSatellitesFormShown);
        sateye.satellites.dom.filterSatellitesInput.on("keyup", sateye.satellites.onFilterExistingSatellites);

        sateye.satellites.onNewSatellites([]);
    },

    onSatellitesModalShown: function(e) {
        sateye.satellites.dom.existingSatellitesForm.collapse("hide");
        sateye.satellites.dom.createSatelliteForm.collapse("hide");
    },

    onExistingSatellitesFormShown: function(e) {
        // when the existing satellites form is shown, populate the satellites list

        // the user must know the list is loading
        sateye.satellites.dom.existingSatellitesList.html("");
        sateye.satellites.dom.existingSatellitesList.append("<p>Loading...</p>");

        // request the list
        return $.ajax({
            url: "/api/satellites/",
            cache: false,
        }).done(sateye.satellites.onSatellitesReceived);
    },

    onSatellitesReceived: function(data) {
        // list of satellites received, populate the existing satellites list
        sateye.satellites.dom.existingSatellitesList.html("");
        var satelliteElement;
        for (let satellite of data) {
            // only add satellites not present in the dashboard
            if (sateye.dashboards.current.getSatellite(satellite.id) === null) {
                satelliteElement = $('<li class="list-group-item list-group-item-action">' + satellite.name + '</li>');
                satelliteElement.data("satelliteId", satellite.id)
                sateye.satellites.dom.existingSatellitesList.append(satelliteElement);

                // and add the click handler, so the satellite is added
                satelliteElement.on("click", sateye.satellites.onExistingSatelliteClicked);
            }
        }
    },

    onExistingSatelliteClicked: function(e) {
        // the user clicked an existing satellite to add it to the dashboard
        var self = $(this);
        console.log('clicked:');
        console.log(self);
        var satelliteId = self.data("satelliteId");
        self.remove();
    },

    onFilterExistingSatellites: function(e) {
        // filter the existing satellites list, in the add existing satellite form
        var filterText = sateye.satellites.dom.filterSatellitesInput.val().toLowerCase();

        sateye.satellites.dom.existingSatellitesList.children("li").filter(function() {
            var self = $(this)
            var containsFilterText = self.text().toLowerCase().indexOf(filterText) > -1
            self.toggle(containsFilterText);
        });
    },

    onNewSatellites: function(satellites) {
        // when the satellites list changes, update the list in the abm

        // remove old list
        sateye.satellites.dom.satellitesList.html("");

        // add satellites to list
        for (let satellite of satellites) {
            var element = sateye.templates.satellite(satellite);
            sateye.satellites.dom.satellitesList.append(element);
        }
    },

    createSatellite: function(dashboardSatelliteConfig) {
        // create a new satellite instance, parsing the json received from an api
        return {
            // general satellite data
            id: dashboardSatelliteConfig.satellite.id,
            name: dashboardSatelliteConfig.satellite.name,
            description: dashboardSatelliteConfig.satellite.description,
            public: dashboardSatelliteConfig.satellite.public,
            noradId: dashboardSatelliteConfig.satellite.norad_id,
            pathPrediction: null,

            // config of the point
            pointSize: dashboardSatelliteConfig.point_size,
            pointColor: dashboardSatelliteConfig.point_color,

            // config of the path
            pathWidth: dashboardSatelliteConfig.path_width,
            pathColor: dashboardSatelliteConfig.path_color,
            pathSecondsAhead: dashboardSatelliteConfig.path_seconds_ahead,
            pathSecondsBehind: dashboardSatelliteConfig.path_seconds_behind,

            predictionsCover: function(startDate, endDate) {
                // check that the satellite has predictions covering a specific range of time
                // (usually asking from the current map date, plus X map seconds)
                if (this.pathPrediction === null) {
                    return false;
                } else {
                    var predictionsStartBefore = Cesium.JulianDate.lessThanOrEquals(this.pathPrediction.startDate, startDate);
                    var predictionsEndAfter = Cesium.JulianDate.greaterThanOrEquals(this.pathPrediction.endDate, endDate);

                    return (predictionsStartBefore && predictionsEndAfter);
                }
            },

            getMorePredictions: function(startDate, endDate, pathSecondsAhead, pathSecondsBehind, timeout) {
                // get more predictions, to fill X seconds starting at a given date
                // (usually asking from the current map date, plus X map seconds)
                console.log("Requesting predictions for satellite " + this.name);
                var self = this;
                $.ajax({
                    url: "/api/satellites/" + this.id + "/predict_path/",
                    cache: false,
                    timeout: timeout,
                    data: {
                        start_date: startDate.toString(),
                        end_date: endDate.toString(),
                        path_seconds_ahead: pathSecondsAhead,
                        path_seconds_behind: pathSecondsBehind
                    }
                })
                .done(function(data) {self.onPredictionsReceived(data)})
                .fail(function(data) {self.onPredictionsError(data)});
            },

            onPredictionsReceived: function(data) {
                // when we receive the response with the requested predictions
                console.log("Predictions received for satellite " + this.name);

                // store the new received path predictions
                this.pathPrediction = {
                    startDate: sateye.parseDate(data.start_date),
                    endDate: sateye.parseDate(data.end_date),
                    positions: data.positions
                }

                sateye.map.onNewPathPrediction(this);
            },

            onPredictionsError: function(data) {
                // when the requested predictions fail
                console.log("Error getting predictions for satellite " + this.name);
                console.log(data);
            },
        }
    },
}
