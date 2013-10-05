var fs = require('fs'),
    events = require('events'),
    path = require('path'),
    analysis = require('./lib/analysis.js'),
    util = require('util')

exports.Freud = Freud

function Freud(source, target, options) {
  this.source = path.normalize(source)
  this.target = path.normalize(target)
  this.processed = []
  this.rules = []
  this.options = options || {}
  this.listener = {}
  this.version = require(path.join(__dirname, 'package.json')).version

  return this
}

util.inherits(Freud, events.EventEmitter)

Freud.prototype.doUnlink = function (filename) {
  var dummyFile = {
    name: filename,
    fullPath: path.join(this.source + filename),
    extension: filename.split('.').pop(),
    write: true,
    stats: undefined,
    data: ''
  }

  this.processFile(dummyFile, parseFile)

  function parseFile(file) {
    analysis.unlink('file', this.target, file.name, checkUnlink)

    function checkUnlink(err, didUnlink) {
      if (!err && didUnlink) return this.emit('unlinked', file.name);
      this.processDir(filename, checkDir)
 
      function checkDir(dir) {
        analysis.unlink('dir', this.target, dir.name, checkDirUnlink)

        function checkDirUnlink(err, didUnlink) {
          if (!err && didUnlink) this.emit('unlinked', dir.name);
        }
      }
    }
  }
}

Freud.prototype.recompile = function (filename) {
  var extension = filename.split('.').pop();
  if (this.rules[extension] || this.rules['*:before'] || this.rules['*:after']) {
    return analysis.compileFile(this, filename, recompileFile)
  }
  fs.exists(path.join(this.target, filename), moveFile)

  function moveFile(fileExists) {
    if (fileExists) {
      fs.unlink(path.join(this.target, filename), function (err) {
        this.copyFile(filename);
      })
    } else {
      this.copyFile(filename);
    }
  }

  function recompileFile(filename, written) {
    this.emit('recompiled', filename);
    if (!written) this.emit('blocked', filename)
  }
}

Freud.prototype.listen = function (extension, callback) {
  if (!Array.isArray(extension)) extension = [extension]
  this.attachListeners(extension, callback)
}

Freud.prototype.checkStats = function (filename, callback) {
  analysis.getFile(this.source, filename, parseStats)
  
  function parseStats(file) {
    if (file.stats === undefined) return callback(false, undefined);
    
    var theMTime = file.stats.mtime.getTime(),
        duplicate = this.processed[filename] && this.processed[filename] === theMTime
    this.processed[filename] = theMTime;
    callback(duplicate, file.stats);
  }
}

Freud.prototype.attachListeners = function (extensions, callback) {

  extensions.forEach(doAttach.bind(this))

  function doAttach(extension) {
    extension = extension === '*' ? '*:before' : extension;
    extension = extension === '/*' ? '/*:before' : extension;
    extension = this.options.ignoreCase ? extension.toLowerCase() : extension;

    this.rules[extension] = this.rules[extension] || [];
    this.rules[extension].push(callback);
    this.emit('extensionAdded', extension);
  }

}

Freud.prototype.go = function () {
  this.listener = fs.watch(this.source, { persistent: true }, this.eventResponse.bind(this))
  this.emit('started', this);
}

Freud.prototype.copyFile = function (filename) {
  this.emit('copying')
  fs.link(path.join(this.source + filename), path.join(this.target + filename), function () {
    this.emit('copied', filename)
  })
}
Freud.prototype.eventResponse = function (event, filename) {

  if (!filename) return this.emit('error', new Error('fs.watch error'))

  if ((!/^\./.test(filename) || this.options.monitorDot) && (!/~$/.test(filename) || this.options.monitorSquiggle)) {
    this.checkStats(filename, statResult)
  }

  function statResult(isDuplicate, stats) {
    if (isDuplicate) return
    if (stats && stats.isDirectory()) {
      return analysis.compileDir(this, filename, fileCompiled)
    }
    var extension = filename.split('.').pop()
    extension = this.options.ignoreCase ? extension.toLowerCase() : extension
    if (this.rules[extension] || this.rules['*:before'] || this.rules['*:after']) {
      return analysis.compileFile(this, filename, fileCompiled)
    }
    fs.exists(this.source + filename, fileMove)
  }

  function fileMove(linkFile) {
    this[(linkFile ? 'copyFile' : 'doUnlink')](filename)
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

