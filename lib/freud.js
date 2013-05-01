var fs = require('fs'),
  events = require('events'),
  util = require('util');

function _getFile(directory, filename, callback) {

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

function _checkDuplicate(freud, filename, callback) {
  _getFile(freud.source, filename, function (file) {
    if (file.stats === undefined) {
      callback(true);
      return;
    }
    var theATime = file.stats.atime.getTime(),
      duplicate = freud.processed[filename] && freud.processed[filename] === theATime;
    freud.processed[filename] = theATime;
    callback(duplicate);
  });
}

function _putFile(directory, file, callback) {
  fs.writeFile(directory + file.name, file.data, function (err) {
    if (err) { throw err; }
    callback(file);
  });
}

function _unlinkFile(directory, filename, callback) {
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

function _executeRules(rules, file, callback) {

  if (rules !== undefined) {
    rules.forEach(function (rule) {
      file = rule(file);
    });
  }
  callback(file);
}

function _processFile(freud, file, callback) {

  _executeRules(freud.rules['*:before'], file, function (file) {
    _executeRules(freud.rules[file.extension], file, function (file) {
      _executeRules(freud.rules['*:after'], file, function (file) {
        callback(file);
      });
    });
  });

}

function _compileFile(freud, filename, callback) {

  freud.emit('compiling', filename);

  fs.exists(freud.source + filename, function (inputFileExists) {
    if (inputFileExists) {

      _getFile(freud.source, filename, function (file) {
        _processFile(freud, file, function (file) {
          if (file.write) {
            _putFile(freud.target, file, function () {
              callback(file.name, true);
            });
          } else {
            callback(file.name, false);
          }
        });
      });

    } else {

      _unlinkFile(freud.target, filename, function () {
        freud.emit('unlinked', filename);
      });

    }
  });

}

function Freud(source, target, options) {

  events.EventEmitter.call(this);

  this.source = source + (source.match(/\/$/) ? '' : '/');
  this.target = target + (target.match(/\/$/) ? '' : '/');
  this.processed = [];
  this.rules = [];
  this.options = options || {};
  this.listener = {};

  this.listen = function (extension, callback) {

    extension = extension === '*' ? '*:before' : extension;

    this.rules[extension] = this.rules[extension] || [];
    this.rules[extension].push(callback);
    this.emit('extensionAdded', extension);

  };

  this.recompile = function (filename) {
    var freud = this;
    _compileFile(this, filename, function (filename, written) {
      freud.emit('recompiled', filename);
      if (!written) {
        freud.emit('blocked', filename);
      }
    });
  };

  this.go = function () {

    var freud = this;

    freud.listener = fs.watch(source, { persistent: true }, function (event, filename) {

      if ((!filename.match(/^\./) && !freud.options.monitorDot) && (!filename.match(/~$/) && !freud.options.monitorSquiggle)) {
        _checkDuplicate(freud, filename, function (isDuplicate) {
          if (!isDuplicate) {
            _compileFile(freud, filename, function (filename, written) {
              freud.emit('compiled', filename);
              if (!written) {
                freud.emit('block', filename);
              }
            });
          }
        });
      }

    });

    freud.emit('started', { "version": "0.1.3" });

  };

  this.stop = function (callback) {

    this.listener.close();
    this.emit('stopped');

    callback && callback();

  };

  return this;

}

util.inherits(Freud, events.EventEmitter);

exports.Freud = Freud;