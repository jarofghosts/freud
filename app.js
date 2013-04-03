var fs = require('fs'),
  freud = require('./lib/freud.js'),
  parsingStack = [];

fs.exists(freud.sourceDirectory, function (exists) {

  if (!exists) {
    console.log('source `' + freud.sourceDirectory + '` does not exist.');
    return -1;
  }

  fs.watch(freud.sourceDirectory, { persistent: true }, function (event, filename) {
    if (!filename.match(/^\./) && filename.match(/\.md$/) && parsingStack.indexOf(filename) === -1) {
      parsingStack.push(filename);
      fs.exists(freud.sourceDirectory + filename, function (inputFileExists) {
        if (inputFileExists) {
          freud.parseMarkdown(filename, function (outputFile, data) {
            freud.renderFile(outputFile, data, function () {
              parsingStack.splice(parsingStack.indexOf(filename), 1);
            });
          });
        } else {
          if (freud.destructive) {
            freud.unlink(filename, function (oldFile) {
              console.log('unlinked ' + oldFile);
              parsingStack.splice(parsingStack.indexOf(filename), 1);
            });
          }
        }
      });
    }
  });

});