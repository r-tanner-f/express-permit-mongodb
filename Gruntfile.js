var flatten = require('lodash.flatten');

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  function importTestData() {

    // Get all the collections we're importing in to
    var folders = grunt.file.expand({ filter: 'isDirectory' }, 'test/data/*');

    // Start building the operations for mongoimport to work with
    var collections = folders.map(function (folder) {

      // This provides the name of the collection
      var collName = folder.split('test/data/')[1];

      // Match all JSON files for that collection
      var files = grunt.file.expand(folder + '/**/*.json');
      console.log(collName);
      console.log(files);

      // Build the individual operations for mongoimport
      var ops = files.map(function (file) {
        var obj = {};
        obj.name = collName;
        obj.type = 'json';
        obj.jsonArray = true;
        obj.file = file;
        return obj;
      });

      // We want the first op to drop the collection
      ops[0].drop = true;

      return ops;
    });

    return flatten(collections);
  }

  grunt.initConfig({
    mongoimport: {
      options: {
        db: 'expressPermit',
        stopOnError: 'true',
        collections: importTestData(),
      },
    },
  });

  grunt.registerTask('default', ['mongoimport']);
};
