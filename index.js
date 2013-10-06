var fs = require('fs'),
    events = require('events'),
    path = require('path'),
    analysis = require('./lib/analysis.js'),
    Watcher = require('watch-fs').Watcher,
    util = require('util')

exports.Freud = Freud
exports.createFreud = createFreud

function Freud(source, target, options) {
  if (!(this instanceof Freud)) return new Freud(source, target, options)

  this.source = path.normalize(source)
  this.target = path.normalize(target)
  this.processed = []
  this.rules = []
  this.options = options || {}
  this.listener = null
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

  this.processFile(dummyFile, parseFile.bind(this))

  function parseFile(file) {
    analysis.unlink('file', this.target, file.name, checkUnlink.bind(this))

    function checkUnlink(err, didUnlink) {
      if (!err && didUnlink) return this.emit('unlinked', file.name);
      this.processDir(filename, checkDir.bind(this))
 
      function checkDir(dir) {
        analysis.unlink('dir', this.target, dir.name, checkDirUnlink.bind(this))

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
    return this.compileFile(filename, recompileFile.bind(this))
  }
  fs.exists(path.join(this.target, filename), moveFile.bind(this))

  function moveFile(fileExists) {
    if (!fileExists) return this.copyFile(filename);
    fs.unlink(path.join(this.target, filename), function (err) {
      this.copyFile(filename);
    })
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
  analysis.getFile(this.source, filename, parseStats.bind(this))
  
  function parseStats(file) {
    if (file.stats === undefined) return callback(null, undefined);
    
    var theMTime = file.stats.mtime.getTime(),
        duplicate = this.processed[filename] && this.processed[filename] === theMTime
    this.processed[filename] = theMTime;
    callback(duplicate, file.stats);
  }
}

Freud.prototype.attachListeners = function (extensions, callback) {

  extensions.forEach(doAttach.bind(this))

  function doAttach(extension) {
    extension = extension === '*' ? '*:before' : extension
    extension = extension === '/*' ? '/*:before' : extension
    extension = this.options.ignoreCase ? extension.toLowerCase() : extension

    this.rules[extension] = this.rules[extension] || []
    this.rules[extension].push(callback)
    this.emit('extensionAdded', extension)
  }

}

Freud.prototype.go = function (cb) {
  this.listener = new Watcher({
    paths: [this.source],
    filters: {
      includeDir: function (dirName) {
        return dirName == this.source
      },
      includeFile: function (fileName) {
        if (!this.options.monitorDot && /^\./.test(fileName)) return false
        if (!this.options.monitorSquiggle && /~$/.test(fileName)) return false
        return true
      }.bind(this)
    }
  })

  this.listener.on('delete', this.doUnlink.bind(this))
  this.listener.on('create', this.eventResponse.bind(this))
  this.listener.on('change', this.eventResponse.bind(this))

  this.listener.start(listenerStarted.bind(this))

  function listenerStarted(err) {
    if (err) return cb && cb(err)
    this.emit('started', this)
    cb && cb()
  }
}

Freud.prototype.copyFile = function (filename) {
  this.emit('copying')
  fs.link(path.join(this.source, filename), path.join(this.target, filename), function () {
    this.emit('copied', filename)
  }.bind(this))
}

Freud.prototype.eventResponse = function (filename) {

  this.checkStats(filename, statResult.bind(this))

  function statResult(isDuplicate, stats) {
    if (isDuplicate) return
    if (stats && stats.isDirectory()) {
      return this.compileDir(filename, fileCompiled.bind(this))
    }
    var extension = filename.split('.').pop()
    extension = this.options.ignoreCase ? extension.toLowerCase() : extension
    if (this.rules[extension] || this.rules['*:before'] || this.rules['*:after']) {
      return this.compileFile(filename, fileCompiled.bind(this))
    }
    this.copyFile(fileName)
  }

  function fileCompiled(filename, written) {
    this.emit('compiled', filename)
    if (!written) this.emit('blocked', filename)
  }
}

Freud.prototype.processFile = function (file, callback) {
  var rules = [].concat(
      (this.rules['*:before'] || [])
      .concat(
      (this.rules[this.options.ignoreCase ? file.extension.toLowerCase() : file.extension] || [])
      .concat(
      (this.rules['*:after'] || []))
    ))
  if (!rules.length) return callback(file)
  analysis.executeRules(rules, file, callback)
}

Freud.prototype.processDir = function (dirname, callback) {

  var dir = { name: dirname, write: true },
      rules = [].concat(
          (this.rules['/*:before'] || [])
          .concat(
          (this.rules['/'] || [])
          .concat(
          (this.rules['/*:after'] ||[]))
        ))

  if (!rules.length) return callback(dir)
  analysis.executeRules(rules, dir, callback)
}

Freud.prototype.compileFile = function (filename, callback) {
  this.emit('compiling', filename)

  fs.exists(path.join(this.source, filename), checkFile.bind(this))

  function checkFile(inputFileExists) {
    if (!inputFileExists) return this.doUnlink(filename)
    analysis.getFile(this.source, filename, parseFile.bind(this))
    function parseFile(file) {
      this.processFile(file, putFile.bind(this))

      function putFile(file) {
        if (!file.write) return callback(file.name, false)

        analysis.putFile(this.target, file, function () {
          callback(file.name, true)
        }.bind(this))
      }
    }
  }
}

Freud.prototype.compileDir = function (filename, callback) {
  this.emit('compiling', filename)

  fs.exists(path.join(this.source, filename), checkDir.bind(this))
  function checkDir(inputDirExists) {
    if (inputDirExists) {
      return this.processDir(filename, onProcess.bind(this))
    }
    this.processDir(filename, processedDir.bind(this))
    function onProcess(dir) {
      if (!dir.write) return callback(dir.name, false);
      analysis.putDir(this.target, dir.name, function () {
        callback && callback(dir.name, true)
      }.bind(this))
    }
    function processedDir(dir) {

      analysis.unlink('dir', this.target, dir.name, unlinked.bind(this))

      function unlinked() {
        this.emit('unlinked', dir.name)
      }
    }
  }
}

Freud.prototype.stop = function (cb) {
  this.listener && this.listener.close()
  this.emit('stopped')

  cb && cb()
}

function createFreud(source, destination, options) {
  return new Freud(source, destination, options)
}

