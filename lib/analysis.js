var fs = require('fs');

function attachListeners(freud, extensions, callback) {
  extensions.forEach(function (extension) {
    extension = extension === '*' ? '*:before' : extension;
    extension = extension === '/*' ? '/*:before' : extension;

    freud.rules[extension] = freud.rules[extension] || [];
    freud.rules[extension].push(callback);
    freud.emit('extensionAdded', extension);
  });
}

function getFile(directory, filename, callback) {
  var fileObject = {
    "name": filename,
    "fullPath": directory + filename,
    "extension": filename.split('.').pop(),
    "write": true
  };

  fs.stat(fileObject.fullPath, function (err, stats) {
    fileObject.stats = stats;
    if (stats && stats.isDirectory()) {
      callback(fileObject);
    } else {
      fs.readFile(fileObject.fullPath, 'utf8', function (err, data) {

        fileObject.data = data;
        callback(fileObject);
      });
    }
  });

}

function checkStats(freud, filename, callback) {
  getFile(freud.source, filename, function (file) {
    if (file.stats === undefined) {
      callback(false, undefined);
      return;
    }
    var theMTime = file.stats.mtime.getTime(),
      duplicate = freud.processed[filename] && freud.processed[filename] === theMTime;
    freud.processed[filename] = theMTime;
    callback(duplicate, file.stats);
  });
}

function putFile(directory, file, callback) {
  fs.writeFile(directory + file.name, file.data, function (err) {
    if (err) { throw err; }
    callback(file);
  });
}

function putDir(directory, dirname, callback) {
  fs.mkdir(directory + dirname, function (err) {
    if (err) { throw err; }
    callback(dirname);
  });
}

function unlink(type, directory, filename, callback) {
  var targetFile = directory + filename;

  fs.exists(targetFile, function (targetExists) {
    if (targetExists) {
      fs.stat(targetFile, function (err, stats) {
        if (stats.isDirectory() && type === 'dir') {
          fs.rmdir(targetFile, function (err) {
            if (err) { throw err; }
            callback(filename);
          });
        } else if (!stats.isDirectory() && type === 'file') {
          fs.unlink(targetFile, function (err) {
            if (err) { throw err; }
            callback(filename);
          });
        } else {
          callback(false);
        }
      });
    } else {
      callback(null);
    }
  });
}

function doUnlink(freud, filename) {
        var dummyFile = {
        "name": filename,
        "fullPath": freud.source + filename,
        "extension": filename.split('.').pop(),
        "write": true,
        "stats": undefined,
        "data": ''
      };

      processFile(freud, dummyFile, function (file) {
        unlink('file', freud.target, file.name, function (didUnlink) {
          if (didUnlink) {
            freud.emit('unlinked', file.name);
          } else {
            processDir(freud, filename, function (dir) {
              unlink('dir', freud.target, dir.name, function (didUnlink) {
                if (didUnlink) {
                  freud.emit('unlinked', dir.name);
                }
              });
            });
          }
        });
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

function processDir(freud, dirname, callback) {

  var dir = {
    "name": dirname,
    "write": true
  };

  executeRules(freud.rules['/*:before'], dir, function (dir) {
    executeRules(freud.rules['/'], dir, function (dir) {
      executeRules(freud.rules['/*:after'], dir, function (dir) {
        callback(dir);
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
      doUnlink(freud, filename);
    }
  });
}

function compileDir(freud, filename, callback) {
  freud.emit('compiling', filename);

  fs.exists(freud.source + filename, function (inputDirExists) {
    if (inputDirExists) {
      processDir(freud, filename, function (dir) {
        if (dir.write) {
          putDir(freud.target, dir.name, function () {
            callback(dir.name, true);
          });
        } else {
          callback(dir.name, false);
        }
      });
    } else {

      processDir(freud, filename, function (dir) {
        unlinkDir(freud.target, dir.name, function () {
          freud.emit('unlinked', dir.name);
        });
      });
    }
  });
}

exports.attachListeners = attachListeners;
exports.compileDir = compileDir;
exports.compileFile = compileFile;
exports.checkStats = checkStats;
exports.doUnlink = doUnlink;