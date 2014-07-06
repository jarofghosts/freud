var EE = require('events').EventEmitter
  , path = require('path')
  , fs = require('fs')

var analysis = require('./lib/analysis.js')
  , Watcher = require('watch-fs').Watcher

module.exports = createFreud

function Freud(source, target, options) {
  EE.call(this)

  this.source = path.normalize(source)
  this.target = path.normalize(target)
  this.rules = []
  this.options = options || {}
  this.listener = null

  return this
}

Freud.prototype = Object.create(EE.prototype)

Freud.prototype.doUnlink = function (filename) {
  filename = path.basename(filename)

  var self = this
    , dummyFile
    , file

  dummyFile = {
      name: filename
    , fullPath: path.join(this.source, filename)
    , extension: analysis.extname(filename)
    , write: true
    , stats: null
    , data: ''
  }

  file = self.processFile(dummyFile)

  analysis.unlink(self.target, file.name, checkUnlink)

  function checkUnlink(err, didUnlink) {
    if(err) return self.emit('error', err)

    if(didUnlink) self.emit('unlinked', file.name)
  }
}

Freud.prototype.recompile = function Freud$recompile(filename) {
  var extension = analysis.extname(filename)
    , self = this

  if(self.rules[extension] || self.rules['*:before'] || self.rules['*:after']) {
    return self.compileFile(filename, recompileFile)
  }

  self.copyFile(filename)

  function recompileFile(filename, written) {
    self.emit('recompiled', filename)
    if(!written) self.emit('blocked', filename)
  }
}

Freud.prototype.listen = function Freud$listen(extension, callback) {
  if(!Array.isArray(extension)) extension = [extension]
  this.attachListeners(extension, callback)
}

Freud.prototype.attachListeners = function (extensions, callback) {
  var self = this

  extensions.forEach(doAttach)

  function doAttach(extension) {
    extension = extension === '*' ? '*:before' : extension
    extension = self.options.ignoreCase ? extension.toLowerCase() : extension

    self.rules[extension] = self.rules[extension] || []
    self.rules[extension].push(callback)
    self.emit('extensionAdded', extension)
  }
}

Freud.prototype.go = function Freud$go(cb) {
  var noRecurseRegexp = new RegExp(this.source + '/?$')
    , self = this

  self.listener = new Watcher({
    paths: self.source,
    filters: {
      includeDir: function(dirName) {
        return noRecurseRegexp.test(dirName)
      },
      includeFile: function(fileName) {
        if(!self.options.monitorDot && /^\./.test(fileName)) return false
        if(!self.options.monitorSquiggle && /~$/.test(fileName)) return false

        return true
      }
    }
  })

  self.listener.on('delete', self.doUnlink.bind(self))
  self.listener.on('create', self.eventResponse.bind(self))
  self.listener.on('change', self.eventResponse.bind(self))

  self.listener.start(listenerStarted)

  function listenerStarted(err) {
    if(err) return cb && cb(err)

    self.emit('started', self)
    cb && cb()
  }
}

Freud.prototype.copyFile = function (filename) {
  var self = this
    , writeStream

  self.emit('copying')

  var writeStream = fs.createWriteStream(path.join(self.target, filename))

  writeStream
      .on('error', console.error.bind(console))
      .on('finish', emitCopied)

  fs.createReadStream(path.join(self.source, filename)).pipe(writeStream)

  function emitCopied() {
    self.emit('copied', filename)
  }
}

Freud.prototype.eventResponse = function Freud$eventResponse(filename, stats) {
  filename = path.basename(filename)

  var extension = analysis.extname(filename)
    , self = this
    , rules

  rules = self.rules

  extension = self.options.ignoreCase ? extension.toLowerCase() : extension

  if(rules[extension] || rules['*:before'] || rules['*:after']) {
    return self.compileFile(filename, fileCompiled)
  }

  self.copyFile(filename)

  function fileCompiled(filename, written) {
    self.emit('compiled', filename)
    if(!written) self.emit('blocked', filename)
  }
}

Freud.prototype.processFile = function (file, callback) {
  var rules = []
    , extension

  extension = file.extension
  if(this.options.ignoreCase) extension = extension.toLowerCase()

  rules = rules.concat(this.rules['*:before'] || [])
  rules = rules.concat(this.rules[extension] || [])
  rules = rules.concat(this.rules['*:after'] || [])

  if(!rules.length) return file

  file = analysis.executeRules(rules, file)

  return file
}

Freud.prototype.compileFile = function (filename, callback) {
  var self = this

  self.emit('compiling', filename)

  analysis.getFile(self.source, filename, processFile)

  function processFile(file) {
    file = self.processFile(file)

    if(!file.write) return callback(file.name, false)

    fs.writeFile(path.join(self.target, file.name), file.data, respond)

    function respond(err) {
      callback(file.name, true)
    }
  }
}

Freud.prototype.stop = function Freud$stop() {
  this.listener && this.listener.stop()
  this.emit('stopped')
}

function createFreud(source, destination, options) {
  return new Freud(source, destination, options)
}
