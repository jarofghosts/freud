var Freud = require('../').Freud,
  freud = new Freud('freudtest-src', 'freudtest-dst', { "ignoreCase": true }),
  assert = require('assert'),
  fs = require('fs'),
  testTimeout = setTimeout(function () {
      assert.ok(false);
  }, 1000);
  
freud.listen('md', function (file) {
  file.data = file.data.replace(/duh/, 'huh');
  
  return file;
})

freud.on('compiling', function (filename) {
  assert.equal(filename, 'testcaps.MD');
  clearTimeout(testTimeout);
});

freud.on('compiled', function () {
  assert.equal(fs.readFileSync('freudtest-dst/testcaps.MD', 'utf8'), 'huh');
  fs.unlinkSync('freudtest-src/testcaps.MD');
});

freud.on('unlinked', function () {
  freud.stop();
});

freud.go(function (err) {
  assert.ok(!err)
  fs.writeFileSync('freudtest-src/testcaps.MD', 'duh');
}); 

