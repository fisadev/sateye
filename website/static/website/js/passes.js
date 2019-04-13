sateye.passes = function() {
    var self = {};
    self.dom = {};
    self.instances = [];

    self.initialize = function() {
        // references to the dom
        self.dom.passesList = $('#passes-list');

        // samples passes retrieved, placeholder until we have GUI to ask for passes
        var startDate = sateye.map.viewer.clock.currentTime;
        var endDate = sateye.addSeconds(startDate, 3600 * 24 * 5);
        setTimeout(function() {self.getPassesPredictions(startDate, endDate, [1, 2], [1])}, 5000)
    }

    self.createPass = function(passData) {
        // create a new pass instance, parsing the json received from an api
        return {
            satellite: sateye.dashboards.current.getSatellite(passData.satellite_id),
            location: sateye.dashboards.current.getLocation(passData.location_id),
            aos: sateye.parseDate(passData.aos),
            los: sateye.parseDate(passData.los),
            tca: sateye.parseDate(passData.tca),
            tcaElevation: passData.tca_elevation,
            sunElevation: passData.sun_elevation,
        };
    }

    self.getPassesPredictions = function(startDate, endDate, satelliteIds, locationIds) {
        // get passes predictions of a group of satellites over a group of locations during a 
        // period of time
        $.ajax({
            url: '/api/predict_passes/',
            cache: false,
            data: {
                start_date: startDate.toString(),
                end_date: endDate.toString(),
                satellite_ids: satelliteIds.join(","),
                location_ids: locationIds.join(","),
            },
        }).done(self.onPassesRetrieved);
    }

    self.onPassesRetrieved = function(data) {
        // list of passes received, populate the passes list
        var passes = [];
        for (let passData of data.passes) {
            passes.push(self.createPass(passData));
        }

        var content = sateye.templates.passesList({passes: passes});
        self.dom.passesList.html(content);
    }

    return self;
}();
