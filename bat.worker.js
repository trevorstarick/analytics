var exec = require('child_process').exec;
var r = require('rethinkdb');

var connection = null;
r.connect({
  host: 'localhost',
  port: 28015
}, function(err, conn) {
  if (err) throw err;
  connection = conn;
});

var CMD = 'ioreg -n AppleSmartBattery -r | grep -v "+-"';

var n = {
  fetch: function(cb) {
    exec(CMD, function(e, so, se) {
      var json = so.trim().split('{\n')[1];
      json = json.substring(0, json.length - 1).trim();
      json = json
        .replace(/Yes/g, true)
        .replace(/No/g, false)
        .replace(/\(/g, '[')
        .replace(/\)/g, ']')
        .replace(/</g, '"')
        .replace(/\>/g, '"')
        .replace(/(=)/g, ":")
        .replace(/\n/g, ',')
        .replace('{,', '{');

      return cb(JSON.parse('{' + json + '}'));
      });
  },
  percentage: function(cb) {
    this.fetch(function(d) {
      return cb(d.CurrentCapacity / d.MaxCapacity);
    });
  },
  currentCapacity: function(cb) {
    this.fetch(function(d) {
      return cb(d.CurrentCapacity);
    });
  },
  maxCapacity: function(cb) {
    this.fetch(function(d) {
      return cb(d.MaxCapacity);
    });
  }
};

setInterval(function() {
  n.percentage(function(v) {

    console.log(v);

    r
      .db('analytics')
      .table('bat_usage')
      .insert({
        value: v,
        timestamp: Date.now()
      })
      .run(connection);
  });
}, 1000);
