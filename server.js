/* jshint node: true */
'use strict';

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var r = require('rethinkdb');

var connection = null;
r.connect({
  host: 'localhost',
  port: 28015
}, function(err, conn) {
  if (err) throw err;
  connection = conn;

  r
    .db('analytics')
    .table('cpu_usage')
    .changes()
    .run(connection, function(err, cursor) {
      if (err) throw err;
      cursor.each(function(err, row) {
        if (err) throw err;
        if (row.new_val && !row.old_val) {
          io.emit('new::cpu', row);
        }
      });
    });

  r
    .db('analytics')
    .table('mem_usage')
    .changes()
    .run(connection, function(err, cursor) {
      if (err) throw err;
      cursor.each(function(err, row) {
        if (err) throw err;
        if (row.new_val && !row.old_val) {
          io.emit('new::mem', row);
        }
      });
    });
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/delete', function(req, res) {
  r
    .db('analytics')
    .table('mem_usage')
    .delete()
    .run(connection, function(err, result) {
      if (err) throw err;
      res.json(result);
    });
});

app.get('/get', function(req, res) {
  var limit = +req.query.l || 300;

  if (req.query.t) {
    r
      .db('analytics')
      .table(req.query.t)
      // .filter(r.row('timestamp').hours().gt(20))
      .orderBy({
        index: r.desc('timestamp')
      })
      .limit(limit)
      .run(connection, function(err, cursor) {
        if (err) {
          res.json({
            err: err
          });
        } else {
          cursor.toArray(function(err, result) {
            if (err) res.json({
              err: err
            });

            res.json(result);
          });
        }
      });
  } else {
    res.end('Missing `t` paramater');
  }
});

server.listen(80);
