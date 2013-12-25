var Freud = require('../').Freud,
    freud = new Freud('freudtest-src', 'freudtest-dst'),
    assert = require('assert'),
    fs = require('fs'),
    eventCheck;


freud.on('copied', function (filename) {
  assert.equal(filename, 'testfile.txt');
  assert.ok(fs.existsSync('freudtest-dst/testfile.txt'));
  fs.unlinkSync('freudtest-src/testfile.txt');
});

freud.on('copying', function () {
  clearTimeout(eventCheck);
});

freud.on('unlinked', function () {
  freud.stop();
});

freud.go(function (err) {
  assert.ok(!err)
  eventCheck = setTimeout(function () {
    assert.ok(false);
  }, 1000);
  fs.writeFileSync('freudtest-src/testfile.txt', 'why hello there');
});

