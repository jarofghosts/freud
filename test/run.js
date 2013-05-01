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

freud.on('compiling', function (filename) {
  assert.equal(filename, 'testfile.txt');
});

freud.on('started', function (version) {
  assert.equal(version.version, '0.1.6');
});

freud.on('compiled', function (filename) {
  assert.equal(filename, 'testfile.text');
  assert.equal(fs.existsSync('freudtest-dst/testfile.text'), true);
  assert.equal(fs.readFileSync('freudtest-dst/testfile.text', { encoding: 'utf8' }), 'y hallo thar');
  freud.stop();
});

freud.on('stopped', function () {
  fs.unlinkSync('freudtest-src/testfile.txt');
  fs.unlinkSync('freudtest-dst/testfile.text');
  fs.rmdirSync('freudtest-src');
  fs.rmdirSync('freudtest-dst');
});

freud.go();

fs.writeFileSync('freudtest-src/testfile.txt', 'why hello there');