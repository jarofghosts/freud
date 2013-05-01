var Freud = require('../lib/freud').Freud,
  freud = new Freud('freudtest-src', 'freudtest-dst'),
  assert = require('assert'),
  fs = require('fs');

freud.listen('md', function (file) {
  file.write = false;
  return file;
});

freud.on('compiled', function (filename) {
  assert.equal(filename, 'testfile2.md');
  assert.ok(!fs.existsSync('freudtest-dst/testfile2.md'));

  freud.listen('md', function (file) {
    file.write = true;
    return file;
  });

  freud.recompile('testfile2.md');
});

freud.on('recompiled', function (filename) {
  assert.equal(filename, 'testfile2.md');
  assert.ok(fs.existsSync('freudtest-dst/testfile2.md'));
  fs.unlinkSync('freudtest-src/testfile2.md');
});

freud.on('extensionAdded', function (extension) {
  assert.equal(extension, 'md');
});

freud.on('unlinked', function (filename) {
  assert.equal(filename, 'testfile2.md');
  assert.ok(!fs.existsSync('freudtest-dst/testfile2.md'));
  fs.rmdirSync('freudtest-src');
  assert.doesNotThrow(function () {
    fs.rmdirSync('freudtest-dst');
  });
  freud.stop();
});

freud.on('blocked', function (filename) {
  assert.equal(filename, 'testfile2.md');
});

assert.doesNotThrow(function () {
  freud.go();
});

fs.writeFileSync('freudtest-src/testfile2.md', '*therefore i am not*');