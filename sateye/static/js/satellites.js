sateye.satellites = {
    active: [],

    initialize: function() {
        sateye.satellites.active.push({
            name: "milanesat",
            tle: "newsat3 42760U\n1 42760U 17034C   18035.48142696  .00000261  00000-0  29808-4 0  9991\n2 42760  43.0171  92.1179 0007969 353.6733 135.8363 15.09016581 35404",
            pathInfo: null,

            hasPredictionsToFillSeconds: function(seconds) {
                // check that the satellite has enough predictions to fill X map seconds
                return false;
            },

            getMorePredictions: function(fromTime, secondsAhead) {
                // get more predictions, to fill X map seconds starting at a given time
                console.log("Requesting predictions for satellite " + this.name);
                $.ajax({url: "/predictions/", cache: false})
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
        });
    },
}
