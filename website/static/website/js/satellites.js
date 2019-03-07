sateye.satellites = {
    active: [],

    initialize: function() {
        sateye.satellites.active.push({
            id: "42",
            name: "milanesat",
            tle: "newsat3 42760U\n1 42760U 17034C   18035.48142696  .00000261  00000-0  29808-4 0  9991\n2 42760  43.0171  92.1179 0007969 353.6733 135.8363 15.09016581 35404",
            pathInfo: null,

            hasPredictionsToFillSeconds: function(fromTime, seconds) {
                // check that the satellite has enough predictions to fill X seconds from a given time onwrads
                // (usually asking from the current map time, plus X map seconds)
                var endTime = new Cesium.JulianDate;
                Cesium.JulianDate.addSeconds(fromTime, seconds, endTime);

                return false;
            },

            getMorePredictions: function(fromTime, seconds, steps) {
                // get more predictions, to fill X seconds starting at a given time
                // (usually asking from the current map time, plus X map seconds)
                console.log("Requesting predictions for satellite " + this.name);
                $.ajax({
                    url: "/api/satellite/" + this.id + "/path_prediction/", 
                    cache: false,
                    data: {
                        start: fromTime.toString(),
                        duration: seconds,
                        steps: steps,
                    }
                })
                .done(sateye.satellites.onPredictionsReceived)
                .fail(sateye.satellites.onPredictionsError);
            },

            onPredictionsReceived: function(data) {
                // when we receive the response with the requested predictions
                console.log("Predictions received for satellite " + this.name);
                console.log(data);
            },

            onPredictionsError: function(data) {
                // when the requested predictions fail
                console.log("Error getting predictions for satellite " + this.name);
                console.log(data);
            },
        }
    },
}
