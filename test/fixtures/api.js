'use strict';
var util = require('util');

var Express = require('express');
var session = require('express-session');

var app = Express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

var permissions = require('express-permit');
var MongoDbPermitStore = require('../../src')(permissions);
var api = permissions.api;

app.use(session({
  secret: 'keyboard cat',
  resave: 'false',
  saveUninitialized: true,
}));

app.use(permissions({
  store: new MongoDbPermitStore({ url: 'mongodb://localhost/expressPermit' }),
  username: req => req.session.username,
}));

app.get('/login/:user', function (req, res) {
  req.session.username = req.params.user;
  res.send('Logged in as ' + req.params.user);
});

function ok(req, res) {
  res.sendStatus(200);
}

// readAll =====================================================================

app.get('/users', api.readAll, function (req, res) {
  res.send(res.locals.permitAPI.users);
});

app.get('/groups', api.readAllGroups, function (req, res) {
  res.send(res.locals.permitAPI.groups);
});

// Users =======================================================================

app.post('/user/:username', api.create, ok);

app.get('/user/:username', api.read, function (req, res) {
  res.send(res.locals.permitAPI.user);
});

app.get('/user/rsop/:username', api.rsop, function (req, res) {
  res.send(res.locals.permitAPI.user.permit);
});

app.put('/user/:username', api.update, ok);
app.delete('/user/:username', api.destroy, ok);

app.get('/setAdmin/:username', api.setAdmin, ok);
app.get('/setOwner/:username', api.setOwner, ok);

// Permission Operations -------------------------------------------------------

app.get('/addPermission/:username/:suite?/:permission', api.addPermission, ok);

// Group Operations ------------------------------------------------------------

app.get('/addGroup/:username/:group', api.addGroup, ok);
app.get('/removeGroup/:username/:group', api.removeGroup, ok);

// Groups ======================================================================

// CRUD ------------------------------------------------------------------------

app.post('/group/:group', api.createGroup, ok);

app.get('/group/:group', api.readGroup, function (req, res) {
  res.send(res.locals.permitAPI.group);
});

app.put('/group/:group', api.updateGroup, ok);
app.delete('/group/:group', api.destroyGroup, ok);

// Error handler
app.use(function (err, req, res, next) { //jshint ignore:line
  if (err instanceof permissions.error.BadRequest) {
    console.log(err);
    return res.status(400).send(err.toString());
  }

  if (err instanceof permissions.error.Conflict) {
    return res.status(409).send(err.toString());
  }

  if (err instanceof permissions.error.NotFound) {
    return res.status(404).send(err.toString());
  }

  if (err instanceof permissions.error.Forbidden) {
    return res.status(403).send('Go away!!');
  }

  console.error('Got unknown error: ', util.inspect(err, { depth: null }));
  next(err);
});

module.exports = app;

