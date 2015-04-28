var os = require('os-utils');

var r = require('rethinkdb');

var connection = null;
r.connect({
  host: 'localhost',
  port: 28015
}, function(err, conn) {
  if (err) throw err;
  connection = conn;
});

setInterval(function() {
  var v = 1 - os.freememPercentage();

  console.log(v);

  r
    .db('analytics')
    .table('mem_usage')
    .insert({
      value: v,
      timestamp: Date.now()
    })
    .run(connection);
}, 1000);
