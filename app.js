var fs = require('fs'),
  freud = require('./lib/freud.js');

fs.watch(freud.sourceDirectory, { persistent: true }, function (event, filename) {
  if (!filename.match(/^\./) && filename.match(/\.md$/)) {
    freud.parseMarkdown(filename, function (outputFile, data) {
      freud.renderFile(outputFile, data);
    });
  }
});