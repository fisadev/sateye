sateye.satellites = {
    active: [],

    initialize: function() {
        this.listSatellites();
    },

    listSatellites: function() {
        var self = this;
        return $.ajax({
            url: "/api/satellites/",
            cache: false,
        }).done(function(data) {
            for (var i = 0; i < data.length; i++) {
                // Render satellites in list
                var element = sateye.templates.satellite(data[i]);
                sateye.dom.satelliteList.append(element);

                // Create paths in cesium map
                var satellite = self.createSatellite(data[i].id, data[i].name);
                self.active.push(satellite);
            }
        });
    },

    createSatellite: function(id, name) {
        return {
            id: id,
            name: name,
            pathPrediction: null,

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

            getMorePredictions: function(startDate, endDate, steps) {
                // get more predictions, to fill X seconds starting at a given date
                // (usually asking from the current map date, plus X map seconds)
                console.log("Requesting predictions for satellite " + this.name);
                var self = this;
                $.ajax({
                    url: "/api/satellites/" + this.id + "/predict_path/",
                    cache: false,
                    data: {
                        start_date: startDate.toString(),
                        end_date: endDate.toString(),
                        steps: steps,
                    }
                })
                .done(function(data) {self.onPredictionsReceived(data)})
                .fail(function(data) {self.onPredictionsError(data)});
            },

            onPredictionsReceived: function(data) {
                // when we receive the response with the requested predictions
                console.log("Predictions received for satellite " + this.name);
                console.log(data);

                // store the new received path predictions
                this.pathPrediction = {
                    startDate: sateye.parseDate(data.start_date),
                    endDate: sateye.parseDate(data.end_date),
                    czml: data.czml,
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
