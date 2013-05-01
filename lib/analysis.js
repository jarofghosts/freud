var fs = require('fs');

function getFile(directory, filename, callback) {
  var fileObject = {
    "name": filename,
    "fullPath": directory + filename,
    "extension": filename.split('.').pop(),
    "write": true
  };

  fs.readFile(fileObject.fullPath, { encoding: 'utf8' }, function (err, data) {
    fileObject.data = data;
    fs.stat(fileObject.fullPath, function (err, stats) {
      fileObject.stats = stats;
      callback(fileObject);
    });
  });
}

function checkDuplicate(freud, filename, callback) {
  getFile(freud.source, filename, function (file) {
    if (file.stats === undefined) {
      callback(false);
      return;
    }
    var theMTime = file.stats.mtime.getTime(),
      duplicate = freud.processed[filename] && freud.processed[filename] === theMTime;
    freud.processed[filename] = theMTime;
    callback(duplicate);
  });
}

function putFile(directory, file, callback) {
  fs.writeFile(directory + file.name, file.data, function (err) {
    if (err) { throw err; }
    callback(file);
  });
}

function unlinkFile(directory, filename, callback) {
  var targetFile = directory + filename;

  fs.exists(targetFile, function (targetExists) {
    if (targetExists) {
      fs.unlink(targetFile, function (err) {
        if (err) { throw err; }
        callback(filename);
      });
    }
  });
}

function executeRules(rules, file, callback) {
  if (rules !== undefined) {
    rules.forEach(function (rule) {
      file = rule(file);
    });
  }
  callback(file);
}

function processFile(freud, file, callback) {
  executeRules(freud.rules['*:before'], file, function (file) {
    executeRules(freud.rules[file.extension], file, function (file) {
      executeRules(freud.rules['*:after'], file, function (file) {
        callback(file);
      });
    });
  });
}

function compileFile(freud, filename, callback) {
  freud.emit('compiling', filename);

  fs.exists(freud.source + filename, function (inputFileExists) {
    if (inputFileExists) {
      getFile(freud.source, filename, function (file) {
        processFile(freud, file, function (file) {
          if (file.write) {
            putFile(freud.target, file, function () {
              callback(file.name, true);
            });
          } else {
            callback(file.name, false);
          }
        });
      });
    } else {

      var dummyFile = {
        "name": filename,
        "fullPath": freud.source + filename,
        "extension": filename.split('.').pop(),
        "write": true,
        "stats": undefined,
        "data": ''
      };

      processFile(freud, dummyFile, function (file) {
        unlinkFile(freud.target, file.name, function () {
          freud.emit('unlinked', file.name);
        });
      });
    }
  });
}

exports.compileFile = compileFile;
exports.checkDuplicate = checkDuplicate;