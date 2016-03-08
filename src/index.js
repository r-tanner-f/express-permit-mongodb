'use strict';

const CONFLICT_CODE = 11000;
const noStore = 'Must pass express-permit to constructor! Example: ' +
'var MongoDbPermitStore = require(\'express-permit-mongo\')(permissions);';
const noConn = 'express-permit-mongodb requires either a connection URL' +
'or an existing Mongoose connection';

var MongoClient = require('mongodb');

module.exports = function (expressPermit) {
  if (!expressPermit.Store) {
    throw new Error(noStore);
  }

  const Store = expressPermit.Store;

  class MongoDbPermitStore extends Store {
    constructor(options) {
      super();

      this.options = options;

      this.collectionName = options.collection ||
        'express-permit-users';
      this.groupsCollectionName = options.groupsCollection ||
        'express-permit-groups';

      this.changeState('init');

      const newConnection = (err, db) => {
        if (err) {
          this.changeState('error', err);
        } else {
          this.db = db;
          this.collection = db.collection(this.collectionName);
          this.groupsCollection = db.collection(this.groupsCollectionName);

          // TODO async.parallel and check for errors
          this.collection.ensureIndex('username', { unique: true });
          this.groupsCollection.ensureIndex('name', { unique: true });

          this.changeState('connected');
        }
      };

      // Classic MongoDB connection url
      if (options.url) {
        MongoClient.connect(

          // New native connection using url and options
          options.url, options.mongoOptions || {}, newConnection
        );

      // Mongoose connection
      } else if (options.mongooseConnection) {

        // Reuse if it's ready already
        if (options.mongooseConnection.readyState === 1) {
          this.db = options.mongooseConnection.db;
          this.changeState('connected');
        } else {
          options.mongooseConnection.once(
            'open',
            function () {
              this.db = options.mongooseConnection.db;
              this.changeState('connected');
            }
          );
        }

      // No connection provided
      } else {
        throw new Error(noConn);
      }
    }

    //
    readAll(callback) {
      this.db.collection(this.collectionName).find().toArray((err, result) => {
        if (err) {callback(err);}

        var users = result.map(u => {
          delete u._id;
          return u;
        });
        callback(null, users);
      });
    }

    readAllGroups(callback) {
      this.db.collection(this.groupsCollectionName)
      .find().toArray((err, result) => {
        if (err) {callback(err);}

        var groups = result.map(g => {
          delete g._id;
          return g;
        });
        callback(null, groups);
      });
    }

    // Users ===================================================================

    create(username, user, callback) {
      this.db.collection(this.collectionName).
      insert({
        username: username,
        permissions: user.permissions,
        groups: user.groups,
      }, (err, result) => {
        if (err) {

          // If the MongoDB error code is 11000
          // there's been a unique index collision
          if (err.code === CONFLICT_CODE) {
            return callback(new this.error.Conflict(
              `User ${username} already exists`
            ));
          }

          return callback(err);
        }

        callback(null, result);
      });
    }

    read(username, callback) {
      var _this = this;
      this.db.collection(this.collectionName).
      findOne(
        {
          username: username,
        }, {
          fields: { _id: false },
        }, function (err, result) {
          if (err) {return callback(err);}

          if (!result) {
            return callback(
              new _this.error.NotFound(`Could not find user ${username}`)
            );
          }

          callback(null, result);
        }
      );
    }

    rsop(username, callback) {

      // Read the user
      this.read(username, (err, user) => {
        if (err) {return callback(err);}

        if (user.groups.length) {

          // Find all the groups
          this.db.collection(this.groupsCollectionName).
          find(
            { name: { $in: user.groups } },
            { _id: false }
          ).toArray((err, result) => {
            user.groupPermissions = result.map(group => group.permissions);
            callback(null, user);
          });
        }
      });
    }

    update(username, user, callback) {
      this.db.collection(this.collectionName).
      update({ username: username }, { $set: user }, (err, result) => {
        if (err) {
          return callback(err);
        }

        if (result.result.nModified === 0) {
          return callback(
            new this.error.NotFound(`User ${username} not found`)
          );
        }

        callback(null, result);
      });
    }

    destroy(username, callback) {
      this.db.collection(this.collectionName).
      deleteOne({ username: username }, (err, result) => {
        if (err) {
          return callback(err);
        }

        if (result.result.n === 0) {
          return callback(
            new this.error.NotFound(`User ${username} not found`)
          );
        }

        callback(null, result);
      });
    }

    setAdmin(username, callback) {
      this.db.collection(this.collectionName).
      update(
        { username: username },
        { $set: { permissions: 'admin' } },
        (err, result) => {
          if (err) {
            return callback(err);
          }

          if (result.result.nModified === 0) {
            return callback(
              new this.error.NotFound(`User ${username} not found`)
            );
          }

          callback(null, result);
        }
      );
    }

    setOwner(username, callback) {
      this.db.collection(this.collectionName).
      update(
        { username: username },
        { $set: { permissions: 'owner' } },
        (err, result) => {
          if (err) {
            return callback(err);
          }

          if (result.result.nModified === 0) {
            return callback(
              new this.error.NotFound(`User ${username} not found`)
            );
          }

          callback(null, result);
        }
      );
    }

    addPermission(username, action, suite, callback) {
      var update = {
        $set: {
          permissions: {},
        },
      };
      update.$set.permissions[suite] = {};
      update.$set.permissions[suite][action] = true;

      this.db.collection(this.collectionName).
      update(
        { username: username }, update,
        (err, result) => {
          if (err) {
            return callback(err);
          }

          if (result.result.nModified === 0) {
            return callback(
              new this.error.NotFound(`User ${username} not found`)
            );
          }

          callback(null, result);
        }
      );
    }

    addGroup(username, group, callback) {
      this.db.collection(this.collectionName).
      update(
        { username: username },
        { $addToSet: { groups: group } },
        (err, result) => {
          if (err) {
            return callback(err);
          }

          if (result.result.n === 0) {
            return callback(
              new this.error.NotFound(`User ${username} not found`)
            );
          }

          callback(null, result);
        }
      );
    }

    removeGroup(username, group, callback) {
      this.db.collection(this.collectionName).
      update(
        { username: username },
        { $pull: { groups: group } },
        (err, result) => {
          if (err) {
            return callback(err);
          }

          if (result.result.n === 0) {
            return callback(
              new this.error.NotFound(`User ${username} not found`)
            );
          }

          callback(null, result);
        }
      );
    }

    updateGroups(username, groups, callback) {
      this.db.collection(this.collectionName).
      update(
        { username: username },
        { $set: { groups: groups } },
        (err, result) => {
          if (err) {
            return callback(err);
          }

          if (result.result.n === 0) {
            return callback(
              new this.error.NotFound(`User ${username} not found`)
            );
          }

          callback(null, result);
        }
      );
    }

    // Groups ==================================================================
    createGroup(group, permissions, callback) {
      this.db.collection(this.groupsCollectionName).
      insert({
        name: group,
        permissions: permissions,
      }, (err, result) => {
        if (err) {

          // If the MongoDB error code is 11000
          // there's been a unique index collision
          if (err.code === CONFLICT_CODE) {
            return callback(new this.error.Conflict('Group already exists'));
          }

          return callback(err);
        }

        callback(null, result);
      });
    }

    readGroup(name, callback) {
      var _this = this;
      this.db.collection(this.groupsCollectionName).
      findOne(
        {
          name: name,
        }, {
          fields: { _id: false },
        }, function (err, result) {
          if (err) {return callback(err);}

          if (!result) {
            return callback(
              new _this.error.NotFound(`Could not find group ${name}`)
            );
          }

          callback(null, result);
        }
      );
    }

    updateGroup(name, permissions, callback) {
      this.db.collection(this.groupsCollectionName).
      update({ name: name }, {
        $set: {
          permissions: permissions,
        },
      }, (err, result) => {
        if (err) {
          return callback(err);
        }

        if (result.result.nModified === 0) {
          return callback(
            new this.error.NotFound(`Group ${name} not found`)
          );
        }

        callback(null, result);
      });
    }

    destroyGroup(name, callback) {
      this.db.collection(this.groupsCollectionName).
      deleteOne({ name: name }, (err, result) => {
        if (err) {
          return callback(err);
        }

        if (result.result.n === 0) {
          return callback(
            new this.error.NotFound(`Group ${name} not found`)
          );
        }

        callback(null, result);
      });
    }
  }

  return MongoDbPermitStore;

};
