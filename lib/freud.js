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

function _executeCallbacks(rules, file) {

  if (rules !== undefined) {
    rules.foreach(function (callback) {
      file = callback(file);
    });
  }

  return file;
}

function _processFile(freud, file) {

  file = _executeCallbacks(freud.rules['*:before'], file);

  file = _executeCallbacks(freud.rules[file.extension], file);

  file = _executeCallbacks(freud.rules['*:after'], file);

  return file;

}

function _compileFile(freud, filename) {

  if (!filename.match(/^\./) && !filename.match(/~$/) && -freud.processing.indexOf(filename)) {

    freud.processing.push(filename);
    freud.emit('processing', filename);

    fs.exists(freud.source + filename, function (inputFileExists) {

      if (inputFileExists) {

        _getFile(freud.source, filename, function (file) {

          file = _processFile(freud, file);

          if (file.write) {

            _putFile(freud.target, file, function () {
              freud.processing.splice(freud.processing.indexOf(filename), 1);
              freud.emit('processed', file);
            });

          } else {

            freud.emit('processed', file);
            freud.emit('blocked', file);

          }

        });

      } else {

        _unlinkFile(freud.target, filename, function () {
          freud.processing.splice(freud.processing.indexOf(filename), 1);
          freud.emit('unlinked', filename);
        });

      }

    });

  }

}

function Freud(source, target) {

  events.EventEmitter.call(this);

  this.source = source + (source.match(/\/$/) ? '' : '/');
  this.target = target + (target.match(/\/$/) ? '' : '/');
  this.processing = [];
  this.rules = [];

  this.listen = function (extension, callback) {

    this.rules[extension] = this.rules[extension] || [];
    this.rules[extension].push(callback);
    this.emit('extensionAdded', extension);

  };

  this.recompile = function (filename) {
    _compileFile(this, filename);
  };

  this.go = function () {

    var freud = this;

    fs.watch(source, { persistent: true }, function (event, filename) {

      _compileFile(freud, filename);

    });

    this.emit('started');

  };

  return this;

}

util.inherits(Freud, events.EventEmitter);

exports.Freud = Freud;