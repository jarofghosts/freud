var fs = require('fs'),
  events = require('events'),
  analysis = require('./analysis.js'),
  util = require('util');

function Freud(source, target, options) {

  this.source = source + (source.match(/\/$/) ? '' : '/');
  this.target = target + (target.match(/\/$/) ? '' : '/');
  this.processed = [];
  this.rules = [];
  this.options = options || {};
  this.listener = {};
  this.version = '0.2.6';

  this.listen = function (extension, callback) {
    if (!(extension instanceof Array)) { extension = [extension]; }
    analysis.attachListeners(this, extension, callback);
  };

  this.recompile = function (filename) {
    var self = this;

    var extension = filename.split('.').pop();
    if (self.rules[extension] || self.rules['*:before'] || self.rules['*:after']) {
      analysis.compileFile(self, filename, function (filename, written) {
        self.emit('recompiled', filename);
        if (!written) {
          self.emit('blocked', filename);
        }
      });
    } else {
      fs.exists(self.target + filename, function (fileExists) {
        if (fileExists) {
          fs.unlink(self.target + filename, function (err) {
            analysis.copyFile(self, filename)
          });
        } else {
          analysis.copyFile(self, filename);
        }
      });
    }
  };

  this.go = function () {
    var self = this;

    self.listener = fs.watch(source, { persistent: true }, function (event, filename) {

      if (!filename) {
        self.emit('error', 'fs.watch error');
        return;
      }

      if ((!filename.match(/^\./) || self.options.monitorDot) && (!filename.match(/~$/) || self.options.monitorSquiggle)) {
        analysis.checkStats(self, filename, function (isDuplicate, stats) {
          if (!isDuplicate) {
            if (stats && stats.isDirectory()) {
              analysis.compileDir(self, filename, function (filename, written) {
                self.emit('compiled', filename);
                if (!written) {
                  self.emit('blocked', filename);
                }
              });
            } else {
              var extension = filename.split('.').pop();
              if (self.rules[extension] || self.rules['*:before'] || self.rules['*:after']) {
                analysis.compileFile(self, filename, function (filename, written) {
                  self.emit('compiled', filename);
                  if (!written) {
                    self.emit('blocked', filename);
                  }
                });
              } else {
                fs.exists(self.source + filename, function (linkFile) {
                  if (linkFile) {
                    analysis.copyFile(self, filename);
                  } else {
                    analysis.doUnlink(self, filename);
                  }
                });
              }
            }
          }
        });
      }

    });
    self.emit('started', self);
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
