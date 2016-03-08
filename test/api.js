'use strict';

var util           = require('util'); //jshint ignore:line

var chai      = require('chai');
var dirtyChai = require('dirty-chai');
var expect    = chai.expect;
chai.use(dirtyChai);

var supertest = require('supertest');

var fixtures = require('./fixtures/data');

var app = require('./fixtures/api');

var async = require('async');

describe('API', function () {
  var agent = supertest.agent(app);

  function read(username, callback) {
    agent
    .get('/user/' + username)
    .expect(200)
    .end(function (err, result) {
      callback(err, result.body);
    });
  }

  function readGroup(name, callback) {
    agent
    .get(`/group/${name}`)
    .expect(200)
    .end(function (err, result) {
      callback(err, result.body);
    });
  }

  // Create the users and groups we'll need for testing ========================

  it('should create users', function (done) {
    var createOps = fixtures.allUsers.map(function (user) {
      return function (callback) {
        agent
        .post('/user/' + user.username)
        .send(
          { user: { permissions: user.permissions, groups: user.groups } }
        )
        .expect(200)
        .end(callback);
      };
    });

    async.parallel(createOps, function (err) {
      expect(err, `Error creating users`).to.not.exist();
      done();
    });
  });

  it('should create groups', function (done) {
    var createOps = fixtures.allGroups.map(function (group) {
      return function (callback) {
        agent
        .post('/group/' + group.name)
        .send(
          { permissions: group.permissions }
        )
        .expect(200)
        .end(callback);
      };
    });

    async.parallel(createOps, function (err) {
      expect(err, `Error creating users`).to.not.exist();
      done();
    });
  });

  // Read what we've created ===================================================

  it('should read all users', function (done) {
    agent
    .get('/users')
    .expect(200)
    .end(function (err, result) {
      if (err) {throw err;}

      result.body.forEach(function (u) {
        expect(u, 'User read did not match user created')
        .to.deep.equal(fixtures[u.username]);
      });

      expect(result.body, 'Users read did not include ALL users created')
      .to.deep.include.members(fixtures.allUsers);

      expect(result.body.length, 'Got more users than we created')
      .to.equal(fixtures.allUsers.length);

      done();
    });
  });

  it('should read all groups', function (done) {
    agent
    .get('/groups')
    .expect(200)
    .end(function (err, result) {
      if (err) {throw err;}

      result.body.forEach(function (g) {
        expect(g, 'Group read did not match group created')
        .to.deep.equal(fixtures[g.name]);
      });

      expect(result.body, 'Groups read did not include ALL groups created')
      .to.deep.include.members(fixtures.allGroups);

      expect(result.body.length, 'Got more groups than we created')
      .to.equal(fixtures.allGroups.length);

      done();
    });
  });

  it('should read a single user', function (done) {
    agent
    .get('/user/staticUser')
    .expect(200)
    .end(function (err, result) {
      expect(err).to.not.exist();
      expect(result.body).to.deep.equal(fixtures.staticUser);
      done();
    });
  });

  it('should get the rsop for a user', function (done) {
    agent
    .get('/user/rsop/rsopUser')
    .expect(200)
    .end(function (err, result) {
      expect(err).to.not.exist();
      expect(result.body).to.deep.equal({
        'block-test': { 'block-me': false },
        'group-test': { 'some-perm': true, 'add-me': true },
        root: {},
      });
      done();
    });
  });

  it('should update a user', function (done) {
    var update = {
      user: { permissions: { root: { updated: true } }, groups: [], },
    };
    agent
    .put('/user/updatableUser')
    .send(update)
    .expect(200)
    .end(function (err) {
      expect(err, 'Problem updating user').to.not.exist();
      read('updatableUser', (err, user) => {
        expect(err, 'Problem reading the user after update').to.not.exist();

        expect(user.permissions).to.deep.equal(update.user.permissions);
        expect(user.groups).to.deep.equal(update.user.groups);
        done();
      });
    });
  });

  it('should delete a user', function (done) {
    agent
    .delete('/user/deletableUser')
    .expect(200)
    .end(function (err) {
      expect(err, 'Problem deleting user').to.not.exist();

      agent
      .get('/user/deletableUser')
      .expect(404)
      .end(function (err) {
        expect(
          err,
          'User may not have been deleted, or NotFound error was not passed'
        ).to.not.exist();
        done();
      });
    });
  });

  it('should set a user to admin', function (done) {
    agent
    .get('/setAdmin/nonAdmin')
    .expect(200)
    .end(function (err) {
      expect(err).to.not.exist();
      read('nonAdmin', (err, result) => {
        expect(result.permissions).to.equal('admin');
        done();
      });
    });
  });

  it('should set a user to owner', function (done) {
    agent
    .get('/setOwner/nonOwner')
    .expect(200)
    .end(function (err) {
      expect(err, 'Problem setting a user to owner').to.not.exist();
      read('nonOwner', (err, result) => {
        expect(result.permissions).to.equal('owner');
        done();
      });
    });
  });

  it('should add a permission to a user', function (done) {
    agent
    .get('/addPermission/someUser/add-me')
    .expect(200)
    .end(function (err) {
      expect(err, 'Problem giving a user permission to an action')
      .to.not.exist();
      read('someUser', (err, result) => {
        expect(result.permissions.root['add-me']).to.be.true();
        done();
      });
    });
  });

  it('should add a user to a group', function (done) {
    agent
    .get('/addGroup/someUser/join-me')
    .expect(200)
    .end((err) => {
      expect(err, 'Problem adding user to group').to.not.exist();
      read('someUser', (err, result) => {
        expect(result.groups).to.include('join-me');
        done();
      });
    });
  });

  it('should remove a user from a group', function (done) {
    agent
    .get('/removeGroup/someUser/remove-me')
    .expect(200)
    .end((err) => {
      expect(err, 'Problem adding user to group').to.not.exist();
      read('someUser', (err, result) => {
        expect(result.groups).to.not.include('remove-me');
        done();
      });
    });
  });

  it('should update a user\'s groups', function (done) {
    agent
    .put('/updateGroups/someUser')
    .send({groups: ['updated-all']})
    .expect(200)
    .end((err) => {
      expect(err, 'Problem updating user\'s groups').to.not.exist();
      read('someUser', (err, result) => {
        expect(result.groups).to.deep.equal(['updated-all']);
        done();
      });
    });
  });

  it('should read a single group', function (done) {
    agent
    .get('/group/read-me')
    .expect(200)
    .end(function (err, result) {
      expect(err).to.not.exist();
      expect(result.body).to.deep.equal(fixtures['read-me']);
      done();
    });
  });

  it('should update a group', function (done) {
    var update = {
      permissions: { root: { updated: true } },
    };
    agent
    .put('/group/update-me')
    .send(update)
    .expect(200)
    .end((err) => {
      expect(err, 'Problem updating group').to.not.exist();
      readGroup('update-me', (err, result) => {
        expect(result.permissions).to.deep.equal(update.permissions);
        done();
      });
    });
  });

  it('should delete a user', function (done) {
    agent
    .delete('/group/delete-me')
    .expect(200)
    .end(function (err) {
      expect(err, 'Problem deleting group').to.not.exist();

      agent
      .get('/group/delete-me')
      .expect(404)
      .end(function (err) {
        expect(
          err,
          'Group may not have been deleted, or NotFound error was not passed'
        ).to.not.exist();
        done();
      });
    });
  });

  // Error handling ============================================================

  it('should throw a Conflict error when creating a user that already exists',
    function (done) {
      var user = {
        user: {
          permissions: {
          },
          groups: [],
        },
      };

      agent
      .post('/user/someUser')
      .send(user)
      .expect(409)
      .end((err, result) => {
        expect(err, 'Did not get Conflict response').to.not.exist();
        expect(
          result.text,
          'Expected 409 and the string "exits" to be somewhere in the message'
        ).to.match(/exists/);
        done();
      });
    }
  );

  it(
    'should throw a Conflict error when creating a group that already exists',
    function (done) {
      var group = {
        permissions: {},
      };

      agent
      .post('/group/read-me')
      .send(group)
      .expect(409)
      .end((err, result) => {
        expect(
          result.text,
          'Expected 409 and the string "exits" to be somewhere in the message'
        ).to.match(/exists/);
        done();
      });
    }
  );

  it('should throw a NotFound when user/group is not found',
    function (done) {

      var user = {
        permissions: {},
        groups: [],
      };

      var tests = [
        notFound('get', '/user/notfound'),
        notFound('get', '/user/rsop/notfound'),
        notFound('put', '/user/notfound', { user: user }),
        notFound('delete', '/user/notfound'),
        notFound('get', '/setAdmin/notfound'),
        notFound('get', '/setOwner/notfound'),
        notFound('get', '/addPermission/notfound/someSuite/someAction'),
        notFound('get', '/addGroup/notfound/add-me'),
        notFound('get', '/removeGroup/notfound/remove-me'),
        notFound('get', '/group/notfound'),
        notFound('put', '/group/notfound', { permissions: {} }),
        notFound('delete', '/group/notfound'),
      ];

      async.parallel(tests, function (err) {
        expect(err).to.not.exist();
        done();
      });

    }
  );

  function notFound(method, url, body) {
    if (!body) {
      return function (callback) {
        agent[method](url).expect(404).end((err, result) => {
          if (err) {
            console.error('This operation failed to 404: ', method, url);
            return callback(err, result);
          }

          callback(null, result);
        });
      };
    }

    return function (callback) {
      agent[method](url).send(body).expect(404).end((err, result) => {
        if (err) {
          console.error('This operation failed to 404: ', method, url);
          return callback(err, result);
        }

        callback(null, result);
      });
    };
  }
});
