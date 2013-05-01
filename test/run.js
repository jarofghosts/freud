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
  assert.ok(fs.existsSync('freudtest-dst/testfile.text'));
  assert.equal(fs.readFileSync('freudtest-dst/testfile.text', { encoding: 'utf8' }), 'y hallo thar');
  
  freud.listen('txt', function (file) {
    file.data = file.data.replace(/y hallo thar/, 'howdy');
    return file;
  });
  
  freud.recompile('testfile.txt');
  
  freud.stop();
});

freud.on('recompiled', function (filename) {
  assert.equal(filename, 'testfile.txt');
  assert.equal(fs.readFileSync('freudtest-dst/testfile.text', { encoding: 'utf8' }), 'howdy');
  freud.stop();
});

freud.on('unlinked', function (filename) {
  assert.equal(filename, 'testfile.txt');
  assert.ok(!fs.existsSync('freudtest-dst/testfile.text'));
});

freud.on('stopped', function () {
  fs.unlinkSync('freudtest-src/testfile.txt');
  fs.rmdirSync('freudtest-src');
  assert.doesNotThrow(function () {
    fs.rmdirSync('freudtest-dst');
  });
});

assert.doesNotThrow(function () {
  freud.go();
});

fs.writeFileSync('freudtest-src/testfile.txt', 'why hello there');