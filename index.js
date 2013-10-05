var fs = require('fs'),
    events = require('events'),
    path = require('path'),
    analysis = require('./lib/analysis.js'),
    util = require('util')

function Freud(source, target, options) {

  this.source = path.normalize(source)
  this.target = path.normalize(target)
  this.processed = []
  this.rules = []
  this.options = options || {}
  this.listener = {}
  this.version = require(path.join(__dirname, 'package.json')).version

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
            analysis.copyFile(self, filename);
          });
        } else {
          analysis.copyFile(self, filename);
        }
      });
    }
  };

  return this;
}

Freud.prototype.go = function () {

  this.listener = fs.watch(source, { persistent: true }, this.eventResponse.bind(this))
  this.emit('started', self);
}

Freud.prototype.eventResponse = function (event, filename) {

  if (!filename) return this.emit('error', new Error('fs.watch error'))

  if ((!/^\./.test(filename) || this.options.monitorDot) && (!/~$/.test(filename) || this.options.monitorSquiggle)) {
    analysis.checkStats(this, filename, statResult)
  }

  function statResult(isDuplicate, stats) {
    if (isDuplicate) return
    if (stats && stats.isDirectory()) {
      return analysis.compileDir(self, filename, fileCompiled)
    }
    var extension = filename.split('.').pop()
    extension = this.options.ignoreCase ? extension.toLowerCase() : extension
    if (this.rules[extension] || this.rules['*:before'] || this.rules['*:after']) {
      return analysis.compileFile(this, filename, fileCompiled)
    }
    fs.exists(this.source + filename, fileMove)
  }

  function fileMove(linkFile) {
    analysis[(linkFile ? 'copyFile' : 'doUnlink')](this, filename)
  }

  function fileCompiled(filename, written) {
    this.emit('compiled', filename)
    if (!written) this.emit('blocked', filename)
  }
}

Freud.prototype.stop = function (cb) {
  this.listener.close()
  this.emit('stopped')

  cb && cb()
}

util.inherits(Freud, events.EventEmitter)
exports.Freud = Freud
