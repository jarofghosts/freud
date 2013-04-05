var fs = require('fs'),
  freud = require('./lib/freud.js'),
  parsingStack = [];

fs.watch(freud.sourceDirectory, { persistent: true }, function (event, filename) {
  if (!filename.match(/^\./) && !filename.match(/~$/) && parsingStack.indexOf(filename) === -1) {
    freud.updateList(function (posts) {
      console.dir(posts);
    });
    parsingStack.push(filename);
    fs.exists(freud.sourceDirectory + filename, function (inputFileExists) {
      if (inputFileExists) {
        if (filename.match(/\.md$/)) {
          freud.parseMarkdown(filename, function (outputFile, data) {
            freud.renderFile(outputFile, data, function () {
              parsingStack.splice(parsingStack.indexOf(filename), 1);
            });
          });
        } else if (filename.match(/\.jade$/)) {
          freud.parseJade(filename, function (outputFile, data) {
            freud.renderFile(outputFile, data, function () {
              parsingStack.splice(parsingStack.indexOf(filename), 1);
            });
          });
        } else if (freud.moveRest) {
          freud.link(filename, function (outputFile) {
            parsingStack.splice(parsingStack.indexOf(filename), 1);
          });
        }

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