var fs = require('fs'),
  events = require('events'),
  analysis = require('./analysis.js');
  util = require('util');

function Freud(source, target, options) {
  events.EventEmitter.call(this);

  this.source = source + (source.match(/\/$/) ? '' : '/');
  this.target = target + (target.match(/\/$/) ? '' : '/');
  this.processed = [];
  this.rules = [];
  this.options = options || {};
  this.listener = {};
  this.version = '0.1.7';

  this.listen = function (extension, callback) {
    extension = extension === '*' ? '*:before' : extension;

    this.rules[extension] = this.rules[extension] || [];
    this.rules[extension].push(callback);
    this.emit('extensionAdded', extension);
  };

  this.recompile = function (filename) {
    var self = this;

    analysis.compileFile(self, filename, function (filename, written) {
      self.emit('recompiled', filename);
      if (!written) {
        self.emit('blocked', filename);
      }
    });
  };

  this.go = function () {
    var self = this;

    self.listener = fs.watch(source, { persistent: true }, function (event, filename) {

      if ((!filename.match(/^\./) && !self.options.monitorDot) && (!filename.match(/~$/) && !self.options.monitorSquiggle)) {
        analysis.checkDuplicate(self, filename, function (isDuplicate) {
          if (!isDuplicate) {
            analysis.compileFile(self, filename, function (filename, written) {
              self.emit('compiled', filename);
              if (!written) {
                self.emit('block', filename);
              }
            });
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