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

            hasPredictionsToFillSeconds: function(fromTime, seconds) {
                // check that the satellite has enough predictions to fill X seconds from a given time onwrads
                // (usually asking from the current map time, plus X map seconds)
                var endTime = sateye.addSeconds(fromTime, seconds);
                return false;
            },

            getMorePredictions: function(startDate, endDate, steps) {
                // get more predictions, to fill X seconds starting at a given time
                // (usually asking from the current map time, plus X map seconds)
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
                    czml: data.czml
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
