sateye.passes = function() {
    var self = {};
    self.dom = {};
    self.current = {};

    self.initialize = function() {
        // references to the dom
        self.dom.passesList = $('#passes-list');
        self.dom.passesModal = $('#passes-modal');

        // samples passes retrieved, placeholder until we have GUI to ask for passes
        var startDate = sateye.map.viewer.clock.currentTime;
        var endDate = sateye.addSeconds(startDate, 3600 * 24 * 5);
        setTimeout(function() {self.getPassesPredictions(startDate, endDate, [1, 2], [1])}, 5000)
    }

    self.createPass = function(passData) {
        // create a new pass instance, parsing the json received from an api
        var pass = {
            id: sateye.uuidv4(),
        };

        // update the basic pass with the data from the api
        pass = Object.assign(pass, passData);
        pass.aos = sateye.parseDate(pass.aos);
        pass.los = sateye.parseDate(pass.los);
        pass.tca = sateye.parseDate(pass.tca);
        
        return pass;
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
        self.current = {};
        var passId = 0;  // we create pass ids in the front end, just to be able to reference them
        for (let passData of data.passes) {
            passData.id = passId;
            self.current[passId] = self.createPass(passData);

            passId += 1;
        }

        // show the passes list
        var content = sateye.templates.passesList({passes: Object.values(self.current)});
        self.dom.passesList.html(content);

        // assign click handlers for the tca links
        $('.pass-tca-link').on('click', self.onPassTcaClick);
    },

    self.onPassTcaClick = function(data) {
        // a tca date was clicked from the list of passes
        var passId = $(this).data('pass-id');

        sateye.map.viewer.clock.currentTime = self.current[passId].tca;
        self.dom.passesModal.modal('hide');
    }

    return self;
}();
