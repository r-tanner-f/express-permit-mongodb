'use strict';

const allUsers = [

  //jscs: disable disallowSpaceAfterObjectKeys
  {
    username: 'someUser',
    permissions: {
      root: { 'delete-me': true, 'block-me': true },
      suite: { 'delete-me': true, 'block-me': true },
    },
    groups: ['remove-me', 'conflict-me'],
  },
  {
    username: 'rsopUser',
    permissions: {
      'block-test': { 'block-me': true },
      'group-test': { 'some-perm': true },
    },
    groups: ['rsop-me'],
  },
  {
    username: 'staticUser',
    permissions: {
      root: { nochanges: true },
    },
    groups: [],
  },
  { username: 'updatableUser', permissions: {}, groups: [], },
  { username: 'deletableUser', permissions: {}, groups: [], },
  { username: 'nonAdmin', permissions: {}, groups: [], },
  { username: 'nonOwner', permissions: {}, groups: [], },
];

const allGroups = [//jshint ignore:line
  { name: 'update-me', permissions: { root: {} } },
  { name: 'join-me', permissions: { root: {} } },
  { name: 'remove-me', permissions: { root: {} } },
  { name: 'delete-me', permissions: { root: {} } },
  { name: 'read-me', permissions: { root: { foo: true } } },
  { name: 'rsop-me', permissions: {
    'block-test': {
      'block-me': false,
    },
    'group-test': {
      'add-me': true,
    },
    root: {},
  }, },
  { name: 'op-me', permissions: { root: { 'remove-me': true } } },
];

exports.allUsers = allUsers;
exports.allGroups = allGroups;

allUsers.forEach(function (u) {
  exports[u.username] = u;
});

allGroups.forEach(function (g) {
  exports[g.name] = g;
});
