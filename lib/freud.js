var fs = require('fs'),
  events = require('events'),
  util = require('util');

function _getFile(directory, filename, callback) {

  var fileObject = {
    "name": filename,
    "fullPath": directory + filename,
    "extension": filename.split('.').pop()
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

function Freud(source, target) {

  events.EventEmitter.call(this);

  this.source = source + (source.match(/\/$/) ? '' : '/');
  this.target = target + (target.match(/\/$/) ? '' : '/');
  this.rules = [];

  this.listen = function (extension, callback) {

    this.rules[extension] = this.rules[extension] || [];
    this.rules[extension].push(callback);
    this.emit('extensionAdded');

  };

  this.go = function () {

    var freud = this,
      processing = [];

    fs.watch(source, { persistent: true }, function (event, filename) {

      if (!filename.match(/^\./) && !filename.match(/~$/) && -processing.indexOf(filename)) {

        processing.push(filename);
        freud.emit('processing');

        fs.exists(freud.source + filename, function (inputFileExists) {

          if (inputFileExists) {

            _getFile(freud.source, filename, function (file) {

              // rules that apply to all get executed first
              if (freud.rules['*'] !== undefined) {

                freud.rules[file.extension].forEach(function (callback) {
                  file = callback(file);
                });

              }

              if (freud.rules[file.extension] !== undefined) {

                freud.rules[file.extension].forEach(function (callback) {
                  file = callback(file);
                });

              }
              _putFile(freud.target, file, function () {
                processing.splice(processing.indexOf(filename), 1);
                freud.emit('processed');
              });

            });

          } else {

            _unlinkFile(freud.target, filename, function () {
              processing.splice(processing.indexOf(filename), 1);
              freud.emit('unlinked');
            });

          }

        });

      }

    });

    this.emit('started');

  };

  return this;

}

util.inherits(Freud, events.EventEmitter);

exports.Freud = Freud;