var r = require('rethinkdb');

var connection = null;
r.connect({
  host: 'localhost',
  port: 28015
}, function(err, conn) {
  if (err) throw err;
  connection = conn;
});

var pcap = require('pcap');
var session = pcap.createSession("", "tcp"),
  tcp_tracker = new pcap.TCPTracker();

var total = {
  packets: {
    out: 0,
    in : 0
  },
  send: 0,
  recv: 0
};

var running = {
  packets: {
    out: 0,
    in : 0
  },
  send: 0,
  recv: 0
};

function bite(bytes) {
  if (bytes < 1024) {
    return bytes + 'B';
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + 'k';
  } else if (bytes < 1073741824) {
    return (bytes / 1048576).toFixed(1) + 'M';
  } else if (bytes < 1099511627776) {
    return (bytes / 1073741824).toFixed(1) + 'G';
  } else if (bytes < 1125899906842624) {
    return (bytes / 1099511627776).toFixed(1) + 'T';
  } else {
    return (bytes / 1125899906842624).toFixed(1) + 'P';
  }
}

session.on('packet', function(raw_packet) {
  var packet = pcap.decode.packet(raw_packet);
  tcp_tracker.track_packet(packet);
});

tcp_tracker.on("session", function(session) {

  session.on("data send", function(session, data) {
    total.packets.out += 1;
    total.send += data.length;

    running.packets.out += 1;
    running.send += data.length;
  });

  session.on("data recv", function(session, data) {
    total.packets.in += 1;
    total.recv += data.length;

    running.packets.in += 1;
    running.recv += data.length;
  });
});


setInterval(function() {
  console.log(running);

  r
    .db('analytics')
    .table('net_usage')
    .insert({
      payload: running,
      timestamp: Date.now()
    })
    .run(connection);

  running = {
    packets: {
      out: 0,
      in : 0
    },
    send: 0,
    recv: 0
  };

}, 1000);
