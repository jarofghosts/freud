var Freud = require('../lib/freud').Freud,
  freud = new Freud('freudtest-src', 'freudtest-dst'),
  assert = require('assert'),
  fs = require('fs'),
  compiledFiles = 0,
  unlinkedFiles = 0;

freud.listen(['md', 'mkd'], function (file) {
  file.name = file.name.replace(/\.[^.]+$/, '.markdown');
  return file;
});

freud.on('compiled', function (filename) {
  assert.ok(filename == 'test1.markdown' || filename == 'test2.markdown');
  compiledFiles++;
  if (compiledFiles == 2) {
    fs.unlinkSync('freudtest-src/test1.md');
    fs.unlinkSync('freudtest-src/test2.mkd');
  }
});

freud.on('unlinked', function () {
  unlinkedFiles++;
  if (unlinkedFiles == 2) {
    freud.stop();
  }
});

freud.go();

fs.writeFileSync('freudtest-src/test1.md', 'why hello there');
fs.writeFileSync('freudtest-src/test2.mkd', 'why hello there');