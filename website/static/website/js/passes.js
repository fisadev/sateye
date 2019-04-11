sateye.passes = function() {
    var self = {};
    self.dom = {};
    self.instances = [];

    self.initialize = function() {
        self.dom.passesList = $('#passes-list');

        var startDate = sateye.map.viewer.clock.currentTime;
        var endDate = sateye.addSeconds(start, 3600 * 24 * 10);
        self.predictPasses(startDate, endDate, 1, 1);
    }

    self.createPass = function(passData) {
        var dateFormat = 'DD/MM/YYYY HH:mm:ss';
        return {
            aos: dayjs(passData.aos).format(dateFormat),
            los: dayjs(passData.los).format(dateFormat),
            maxElevationDate: dayjs(passData.max_elevation_date).format(dateFormat),
        };
    }

    self.predictPasses = function(startDate, endDate, satelliteId, locationId) {
        var params = {
            start_date: startDate,
            end_date: endDate,
            location: locationId,
        };

        $.ajax({
            url: '/api/satellites/' + satelliteId + '/predict_passes/',
            cache: false,
            data: params,
        }).done(function(data) { self.onPassesRetrieved(data) });
    }

    self.onPassesRetrieved = function(data) {
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
