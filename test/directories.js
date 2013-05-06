var Freud = require('../lib/freud').Freud,
  freud = new Freud('freudtest-src', 'freudtest-dst'),
  assert = require('assert'),
  fs = require('fs');

freud.on('compiled', function (filename) {
  assert.ok(filename.match(/dir-test$/));
  assert.ok(fs.existsSync('freudtest-dst/dir-test'));

  var stats = fs.statSync('freudtest-dst/dir-test');
  assert.ok(stats.isDirectory());
  fs.rmdirSync('freudtest-src/dir-test');

});

freud.on('unlinked', function (filename) {

  if (filename) {

    assert.ok(filename.match(/dir-test$/));
    assert.ok(!fs.existsSync('freudtest-dst/dir-test'));

    freud.stop();

  }

});

freud.go();

fs.mkdirSync('freudtest-src/dir-test');