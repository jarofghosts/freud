var fs = require('fs');

function attachListeners(freud, extensions, callback) {
  extensions.forEach(function (extension) {
    extension = extension === '*' ? '*:before' : extension;
    extension = extension === '/*' ? '/*:before' : extension;
    extension = freud.options.ignoreCase ? extension.toLowerCase() : extension;

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
    callback(err, file);
  });
}

function putDir(directory, dirname, callback) {
  fs.mkdir(directory + dirname, function (err) {
    callback(err, dirname);
  });
}

function unlink(type, directory, filename, callback) {
  var targetFile = directory + filename;

  fs.exists(targetFile, function (targetExists) {
    if (targetExists) {
      fs.stat(targetFile, function (err, stats) {
        if (stats.isDirectory() && type === 'dir') {
          fs.rmdir(targetFile, function (err) {
            callback(err, filename);
          });
        } else if (!stats.isDirectory() && type === 'file') {
          fs.unlink(targetFile, function (err) {
            callback(err, filename);
          });
        } else {
          callback(null, false);
        }
      });
    } else {
      callback(null, null);
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
    unlink('file', freud.target, file.name, function (err, didUnlink) {
      if (!err && didUnlink) {
        freud.emit('unlinked', file.name);
      } else {
        processDir(freud, filename, function (dir) {
          unlink('dir', freud.target, dir.name, function (err, didUnlink) {
            if (!err && didUnlink) {
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
    executeRules(freud.rules[freud.options.ignoreCase ? file.extension.toLowerCase() : file.extension], file, function (file) {
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
        unlink('dir', freud.target, dir.name, function () {
          freud.emit('unlinked', dir.name);
        });
      });
    }
  });
}

function copyFile(freud, filename) {
  freud.emit('copying');
  fs.link(freud.source + filename, freud.target + filename, function (err) {
    freud.emit('copied', filename);
  });
}

exports.attachListeners = attachListeners;
exports.compileDir = compileDir;
exports.compileFile = compileFile;
exports.checkStats = checkStats;
exports.doUnlink = doUnlink;
exports.copyFile = copyFile;