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

  if ((!filename.match(/^\./) && !freud.options.monitorDot) && (!filename.match(/~$/) && !freud.options.monitorSquiggle) && -freud.processing.indexOf(filename)) {

    freud.processing.push(filename);
    freud.emit('compiling', filename);

    fs.exists(freud.source + filename, function (inputFileExists) {

      if (inputFileExists) {

        _getFile(freud.source, filename, function (file) {

          _processFile(freud, file, function (file) {

            if (file.write) {

              _putFile(freud.target, file, function () {
                freud.processing.splice(freud.processing.indexOf(filename), 1);
                callback(filename, true);
              });

            } else {

              callback(filename, false);

            }

          });

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

function Freud(source, target, options) {

  events.EventEmitter.call(this);

  this.source = source + (source.match(/\/$/) ? '' : '/');
  this.target = target + (target.match(/\/$/) ? '' : '/');
  this.processing = [];
  this.rules = [];
  this.options = options || {};

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

    fs.watch(source, { persistent: true }, function (event, filename) {

      _compileFile(freud, filename, function (filename, written) {
        freud.emit('compiled', filename);
        if (!written) {
          freud.emit('block', filename);
        }
      });

    });

    freud.emit('started', { "version": "0.1.2" });

  };

  return this;

}

util.inherits(Freud, events.EventEmitter);

exports.Freud = Freud;