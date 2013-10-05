var Freud = require('../').Freud,
  freud = new Freud('freudtest-src', 'freudtest-dst'),
  assert = require('assert'),
  fs = require('fs');

freud.listen('/*:after', function (dir) {
  dir.name = 'test-dir';
  return dir;
});

freud.on('compiled', function (filename) {
  assert.ok(filename.match(/test-dir$/));
  assert.ok(fs.existsSync('freudtest-dst/test-dir'));

  var stats = fs.statSync('freudtest-dst/test-dir');
  assert.ok(stats.isDirectory());
  fs.rmdirSync('freudtest-src/dir-test');

});

freud.on('unlinked', function (filename) {

  if (filename) {

    assert.ok(filename.match(/test-dir$/));
    assert.ok(!fs.existsSync('freudtest-dst/test-dir'));

    freud.stop();

  }

});

freud.go();

fs.mkdirSync('freudtest-src/dir-test');
