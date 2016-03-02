'use strict';

var chai      = require('chai');
var dirtyChai = require('dirty-chai');
var expect    = chai.expect;
chai.use(dirtyChai);

var permissions = require('express-permit');
var StoreWrapper = permissions._wrapper;

var MongoDbPermitStore = require('../src');
/*
describe('StoreWrapper', function () {
  var MongoStore = MongoDbPermitStore(permissions);
  var store = new StoreWrapper(new MongoStore({
    url: 'mongodb://localhost/expressPermit',
  }));

  it('should read all users', function (done) {
    store.readAll(function (err, result) {
      expect(result).to.deep.equal(
        [
          {
            name: 'someUser',
            permissions: {
              amusement: {
                'go-on-rides': true,
              },
            },
            groups: ['someGroup'],
          },
        ]
      );
      done();
    });
  });

  it('should read all groups', function (done) {
    store.readAllGroups(function (err, result) {
      expect(result).to.deep.equal(
        [
          {
            name: 'someGroup',
            permissions: {
              root: {
                'enter-park': true,
              },
            },
          },
        ]
      );
      done();
    });
  });
});
*/
