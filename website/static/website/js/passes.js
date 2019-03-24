sateye.passes = {
  dom: {},

  instances: [],

  initialize: function() {
    var start = dayjs().format('YYYY-MM-DD');
    var end = dayjs().add(3, 'day').format('YYYY-MM-DD');

    sateye.passes.dom.passList = $('#pass-list');
    sateye.passes.predictPasses(start, end, 1, 1);
  },

  createPass: function(passData) {
    var dateFormat = 'DD/MM/YYYY HH:mm:ss';
    return {
      aos: dayjs(passData.aos).format(dateFormat),
      los: dayjs(passData.los).format(dateFormat),
      maxElevationDate: dayjs(passData.max_elevation_date).format(dateFormat),
    };
  },

  predictPasses: function(startDate, endDate, satelliteId, locationId) {
    var self = this;
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
  },

  onPassesRetrieved: function(data) {
    var context = {
      passes: [],
      location: 'UTN Los Reyunos',
      satellite: 'ISS',
    };

    for (let passData of data) {
      context.passes.push(this.createPass(passData));
    }

    var content = sateye.templates.passList(context);
    sateye.dom.passList.html(content);
  },
};
