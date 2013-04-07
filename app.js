var fs = require('fs'),
  Freud = require('./lib/freud.js').Freud,
  freud = new Freud('/home/jarofghosts/flog-src', '/home/jarofghosts/flog');

freud.listen('txt', function (file) {
  file.data = 'hey!';
  console.log('raaan');
  return file;
});

freud.go();