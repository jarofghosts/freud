var Freud = require('../lib/freud').Freud,
  freud = new Freud('freudtest-src', 'freudtest-dst'),
  assert = require('assert'),
  fs = require('fs');

fs.mkdirSync('freudtest-src');
fs.mkdirSync('freudtest-dst');

freud.listen('*:before', function (file) {
  file.data = file.data.replace(/why/, 'y');
  return file;
});

freud.listen('txt', function (file) {
  file.data = file.data.replace(/hello/, 'hallo');
  file.name = file.name.replace(/\.txt$/, '.text');
  return file;
});

freud.listen('*:after', function (file) {
  file.data = file.data.replace(/there/, 'thar');
  return file;
});

freud.on('started', function (freud) {
  assert.equal(freud.version, '0.2.4');
  assert.equal(freud.source, 'freudtest-src/');
  assert.equal(freud.target, 'freudtest-dst/');
});

freud.on('extensionAdded', function (extension) {
  assert.equal(extension, 'txt');
});

freud.on('compiled', function (filename) {
  assert.equal(filename, 'testfile.text');
  assert.ok(fs.existsSync('freudtest-dst/testfile.text'));
  assert.equal(fs.readFileSync('freudtest-dst/testfile.text', 'utf8'), 'y hallo thar');

  fs.unlinkSync('freudtest-src/testfile.txt');
});

freud.on('recompiled', function (filename) {
  assert.equal(filename, 'testfile.text');
  assert.equal(fs.readFileSync('freudtest-dst/testfile.text', 'utf8'), 'howdy');
  fs.unlinkSync('freudtest-src/testfile.txt');
});

freud.on('unlinked', function (filename) {
  assert.equal(filename, 'testfile.text');
  assert.ok(!fs.existsSync('freudtest-dst/testfile.text'));

  freud.stop();
});

assert.doesNotThrow(function () {
  freud.go();
});

fs.writeFileSync('freudtest-src/testfile.txt', 'why hello there');