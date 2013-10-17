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
  filename = path.basename(filename)
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
    analysis.unlink(this.target, file.name, checkUnlink.bind(this))

    function checkUnlink(err, didUnlink) {
      if (!err && didUnlink) return this.emit('unlinked', file.name)
      this.emit('error', new Error('file unlink error'))
    }
  }
}

Freud.prototype.recompile = function (filename) {
  var extension = filename.split('.').pop();
  if (this.rules[extension] || this.rules['*:before'] || this.rules['*:after']) {
    return this.compileFile(filename, recompileFile.bind(this))
  }
  this.copyFile(filename)

  function recompileFile(filename, written) {
    this.emit('recompiled', filename);
    if (!written) this.emit('blocked', filename)
  }
}

Freud.prototype.listen = function (extension, callback) {
  if (!Array.isArray(extension)) extension = [extension]
  this.attachListeners(extension, callback)
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
  var noRecurseRegexp = new RegExp(this.source + '/?$')
  this.listener = new Watcher({
    paths: this.source,
    filters: {
      includeDir: function (dirName) {
        return noRecurseRegexp.test(dirName)
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
  var endFileStream = fs.createWriteStream(path.join(this.target, filename))

  endFileStream.on('finish', function () {
    this.emit('copied', filename)
  }.bind(this))

  fs.createReadStream(path.join(this.source, filename)).pipe(endFileStream)
}

Freud.prototype.eventResponse = function (filename, stats) {
  filename = path.basename(filename)

  var extension = filename.split('.').pop()
  extension = this.options.ignoreCase ? extension.toLowerCase() : extension
  if (this.rules[extension] || this.rules['*:before'] || this.rules['*:after']) {
    return this.compileFile(filename, fileCompiled.bind(this))
  }

  this.copyFile(filename)

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

Freud.prototype.compileFile = function (filename, callback) {
  this.emit('compiling', filename)
  analysis.getFile(this.source, filename, function (file) {
    this.processFile(file, putFile.bind(this))
  }.bind(this))

  function putFile(file) {
    if (!file.write) return callback(file.name, false)

    analysis.putFile(this.target, file, function () {
      callback(file.name, true)
    }.bind(this))
  }
}

Freud.prototype.stop = function (cb) {
  this.listener && this.listener.stop()
  this.emit('stopped')

  cb && cb()
}

function createFreud(source, destination, options) {
  return new Freud(source, destination, options)
}
