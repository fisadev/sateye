sateye.satellites = function() {
    var self = {};
    self.dom = {};

    self.initialize = function() {
        // references to the dom
        self.dom.satellitesList = $("#satellites-list");
        self.dom.satellitesModal = $("#satellites-modal");
        self.dom.existingSatellitesForm = $("#existing-satellites-form");
        self.dom.existingSatellitesList = $("#existing-satellites-list");
        self.dom.filterSatellitesInput = $("#filter-satellites-input");
        self.dom.createSatelliteForm = $("#create-satellite-form");

        // assign event handlers
        self.dom.satellitesModal.on("show.bs.modal", self.onSatellitesModalShown);
        self.dom.existingSatellitesForm.on("show.bs.collapse", self.onExistingSatellitesFormShown);
        self.dom.createSatelliteForm.on("show.bs.collapse", self.onCreateSatelliteFormShown);
        self.dom.filterSatellitesInput.on("keyup", self.onFilterExistingSatellites);

        self.onNewSatellites([]);
    }

    self.onSatellitesModalShown = function(e) {
        self.dom.existingSatellitesForm.collapse("hide");
        self.dom.createSatelliteForm.collapse("hide");
    }

    self.onExistingSatellitesFormShown = function(e) {
        // when the existing satellites form is shown, populate the satellites list

        // hide the creation form
        self.dom.createSatelliteForm.collapse("hide");

        // the user must know the list is loading
        self.dom.existingSatellitesList.html("");
        self.dom.existingSatellitesList.append("<p>Loading...</p>");

        // request the list
        return $.ajax({
            url: "/api/satellites/",
            cache: false,
        }).done(self.onSatellitesReceived);
    }

    self.onCreateSatelliteFormShown = function(e) {
        // when the create satellite form is shown hide the existing satellites form
        self.dom.existingSatellitesForm.collapse("hide");
    }

    self.onSatellitesReceived = function(data) {
        // list of satellites received, populate the existing satellites list
        self.dom.existingSatellitesList.html("");
        var satelliteElement;
        for (let satellite of data) {
            // only add satellites not present in the dashboard
            if (sateye.dashboards.current.getSatellite(satellite.id) === null) {
                satelliteElement = $('<li class="list-group-item list-group-item-action">' + satellite.name + '</li>');
                satelliteElement.data("satelliteId", satellite.id)
                self.dom.existingSatellitesList.append(satelliteElement);

                // and add the click handler, so the satellite is added
                satelliteElement.on("click", self.onExistingSatelliteClicked);
            }
        }
    }

    self.onExistingSatelliteClicked = function(e) {
        // the user clicked an existing satellite to add it to the dashboard
        var clickedItem = $(this);
        var satelliteId = clickedItem.data("satelliteId");
        clickedItem.remove();
    }

    self.onFilterExistingSatellites = function(e) {
        // filter the existing satellites list, in the add existing satellite form
        var filterText = self.dom.filterSatellitesInput.val().toLowerCase();

        self.dom.existingSatellitesList.children("li").filter(function() {
            var item = $(this)
            var containsFilterText = item.text().toLowerCase().indexOf(filterText) > -1
            item.toggle(containsFilterText);
        });
    }

    self.onNewSatellites = function(satellites) {
        // when the satellites list changes, update the list in the abm

        // remove old list
        self.dom.satellitesList.html("");

        // add satellites to list
        for (let satellite of satellites) {
            var element = sateye.templates.satellite(satellite);
            self.dom.satellitesList.append(element);
        }
    }

    self.createSatellite = function(dashboardSatelliteConfig) {
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

            getPathPredictions: function(startDate, endDate, pathSecondsAhead, pathSecondsBehind, timeout) {
                // get path predictions, to fill X seconds starting at a given date
                // (usually asking from the current map date, plus X map seconds)
                console.log("Requesting predictions for satellite " + this.name);
                var satellite = this;
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
                .done(function(data) {satellite.onPredictionsReceived(data)})
                .fail(function(data) {satellite.onPredictionsError(data)});
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
    }

    return self;
}();
