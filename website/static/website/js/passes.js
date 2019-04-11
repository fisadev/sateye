sateye.passes = function() {
    var self = {};
    self.dom = {};
    self.instances = [];

    self.initialize = function() {
        // references to the dom
        self.dom.passesList = $('#passes-list');

        // samples passes retrieved, placeholder until we have GUI to ask for passes
        var startDate = sateye.map.viewer.clock.currentTime;
        var endDate = sateye.addSeconds(start, 3600 * 24 * 10);
        self.predictPasses(startDate, endDate, 1, 1);
    }

    self.createPass = function(passData) {
        // create a new pass instance, parsing the json received from an api
        return {
            aos: sateye.parseDate(passData.aos),
            los: sateye.parseDate(passData.los),
            tca: sateye.parseDate(passData.tca),
            tcaElevation: passData.tca_elevation,
            sunElevation: passData.sun_elevation,
        };
    }

    self.getPassesPredictions = function(startDate, endDate, satelliteId, locationId) {
        // get passes predictions of a satellite over a location during a period of time
        $.ajax({
            url: '/api/satellites/' + satelliteId + '/predict_passes/',
            cache: false,
            data: {
                start_date: startDate.toString(),
                end_date: endDate.toString(),
                location: locationId,
            },
        }).done(self.onPassesRetrieved);
    }

    self.onPassesRetrieved = function(data) {
        // list of passes received, populate the passes list
        var context = {
            passes: [],
            location: 'UTN Los Reyunos',
            satellite: 'ISS',
        };

        for (let passData of data) {
            context.passes.push(this.createPass(passData));
        }

        var content = sateye.templates.passesList(context);
        self.dom.passesList.html(content);
    }

    return self;
}();
