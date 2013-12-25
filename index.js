var fs = require('fs'),
    EE = require('events').EventEmitter,
    path = require('path'),
    analysis = require('./lib/analysis.js'),
    Watcher = require('watch-fs').Watcher,
    inherits = require('util').inherits

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
  this.version = require('./package.json').version

  return this
}

inherits(Freud, EE)

Freud.prototype.doUnlink = function (filename) {
  filename = path.basename(filename)
  var self = this,
      dummyFile = {
        name: filename,
        fullPath: path.join(this.source + filename),
        extension: filename.split('.').pop(),
        write: true,
        stats: undefined,
        data: ''
      }

  self.processFile(dummyFile, parseFile)

  function parseFile(file) {
    analysis.unlink(self.target, file.name, checkUnlink)

    function checkUnlink(err, didUnlink) {
      if (!err && didUnlink) return self.emit('unlinked', file.name)
      self.emit('error', new Error('file unlink error'))
    }
  }
}

Freud.prototype.recompile = function (filename) {
  var extension = filename.split('.').pop(),
      self = this

  if (self.rules[extension] || self.rules['*:before'] || self.rules['*:after']) {
    return self.compileFile(filename, recompileFile)
  }

  self.copyFile(filename)

  function recompileFile(filename, written) {
    self.emit('recompiled', filename)
    if (!written) self.emit('blocked', filename)
  }
}

Freud.prototype.listen = function (extension, callback) {
  if (!Array.isArray(extension)) extension = [extension]
  this.attachListeners(extension, callback)
}

Freud.prototype.attachListeners = function (extensions, callback) {
  var self = this

  extensions.forEach(doAttach)

  function doAttach(extension) {
    extension = extension === '*' ? '*:before' : extension
    extension = extension === '/*' ? '/*:before' : extension
    extension = self.options.ignoreCase ? extension.toLowerCase() : extension

    self.rules[extension] = self.rules[extension] || []
    self.rules[extension].push(callback)
    self.emit('extensionAdded', extension)
  }
}

Freud.prototype.go = function (cb) {
  var noRecurseRegexp = new RegExp(this.source + '/?$'),
      self = this

  self.listener = new Watcher({
    paths: self.source,
    filters: {
      includeDir: function (dirName) {
        return noRecurseRegexp.test(dirName)
      },
      includeFile: function (fileName) {
        if (!self.options.monitorDot && /^\./.test(fileName)) return false
        if (!self.options.monitorSquiggle && /~$/.test(fileName)) return false
        return true
      }
    }
  })

  self.listener.on('delete', self.doUnlink.bind(self))
  self.listener.on('create', self.eventResponse.bind(self))
  self.listener.on('change', self.eventResponse.bind(self))

  self.listener.start(listenerStarted)

  function listenerStarted(err) {
    if (err) return cb && cb(err)
    self.emit('started', self)
    cb && cb()
  }
}

Freud.prototype.copyFile = function (filename) {
  var self = this

  self.emit('copying')
  var endFileStream = fs.createWriteStream(path.join(self.target, filename))

  endFileStream.on('finish', function () {
    self.emit('copied', filename)
  })

  fs.createReadStream(path.join(self.source, filename)).pipe(endFileStream)
}

Freud.prototype.eventResponse = function (filename, stats) {
  filename = path.basename(filename)

  var extension = filename.split('.').pop(),
      self = this

  extension = self.options.ignoreCase ? extension.toLowerCase() : extension
  if (self.rules[extension] || self.rules['*:before'] || self.rules['*:after']) {
    return self.compileFile(filename, fileCompiled)
  }

  self.copyFile(filename)

  function fileCompiled(filename, written) {
    self.emit('compiled', filename)
    if (!written) self.emit('blocked', filename)
  }
}

Freud.prototype.processFile = function (file, callback) {
  var rules = [].concat(
      (this.rules['*:before'] || [])
      .concat(
      (this.rules[this.options.ignoreCase ?
          file.extension.toLowerCase() : file.extension] || [])
      .concat(
      (this.rules['*:after'] || []))
    ))
  if (!rules.length) return callback(file)
  analysis.executeRules(rules, file, callback)
}

Freud.prototype.compileFile = function (filename, callback) {
  var self = this

  this.emit('compiling', filename)
  analysis.getFile(self.source, filename, function (file) {
    self.processFile(file, putFile)
  })

  function putFile(file) {
    if (!file.write) return callback(file.name, false)

    analysis.putFile(self.target, file, function () {
      callback(file.name, true)
    })
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
