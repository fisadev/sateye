sateye.satellites = {
    active: [],

    initialize: function() {
        // TODO creating sample satellite, will replace with api later on
        sateye.satellites.active.push(sateye.satellites.createSatellite(1, "iss"));
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
                    url: "/api/satellite/" + this.id + "/predict_path/",
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
