var Freud = require('../lib/freud').Freud,
  freud = new Freud('freudtest-src', 'freudtest-dst', { monitorDot: true, monitorSquiggle: true }),
  assert = require('assert'),
  fs = require('fs'),
  deleted = 0;

freud.listen('txt', function (file) {
  file.data = file.data.replace(/why hello there/, 'howdy');
  return file;
});

freud.listen('*', function (file) {
  file.data = file.data.replace(/harro/, 'why hello there');
  return file;
});

freud.on('compiled', function (filename) {

  if (filename == '.testfile.txt') {
    assert.ok(fs.existsSync('freudtest-dst/.testfile.txt'));
    fs.unlink('freudtest-src/.testfile.txt');
  } else if (filename == 'testfile2.txt~') {
    assert.ok(fs.existsSync('freudtest-dst/testfile2.txt~'));
    fs.unlink('freudtest-src/testfile2.txt~');
  } else {
    assert.ok(false);
  }

});

freud.on('unlinked', function (filename) {
  assert.ok(filename == '.testfile.txt' || filename == 'testfile2.txt~');
  deleted++;
  if (deleted == 2) {
    freud.stop();
  }
});

assert.doesNotThrow(function () {
  freud.go();
});

fs.writeFileSync('freudtest-src/.testfile.txt', 'harro');
fs.writeFileSync('freudtest-src/testfile2.txt~', 'harro');