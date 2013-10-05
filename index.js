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

  this.processFile(dummyFile, parseFile.bind(this))

  function parseFile(file) {
    analysis.unlink('file', this.target, file.name, checkUnlink.bind(this))

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
    return this.compileFile(filename, recompileFile)
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
    this.checkStats(filename, statResult.bind(this))
  }

  function statResult(isDuplicate, stats) {
    if (isDuplicate) return
    if (stats && stats.isDirectory()) {
      return this.compileDir(this, filename, fileCompiled)
    }
    var extension = filename.split('.').pop()
    extension = this.options.ignoreCase ? extension.toLowerCase() : extension
    if (this.rules[extension] || this.rules['*:before'] || this.rules['*:after']) {
      return this.compileFile(filename, fileCompiled.bind(this))
    }
    fs.exists(this.source + filename, fileMove.bind(this))
  }

  function fileMove(linkFile) {
    this[(linkFile ? 'copyFile' : 'doUnlink')](filename)
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

        analysis.putFile(this.target, file, callback.bind(null, file.name, true))
      }
    }
  }
}

Freud.prototype.compileDir = function (filename, callback) {
  this.emit('compiling', filename)

  fs.exists(path.join(this.source, filename), function (inputDirExists) {
    if (inputDirExists) {
      this.processDir(filename, function (dir) {
        if (dir.write) {
          analysis.putDir(this.target, dir.name, function () {
            callback(dir.name, true);
          })
        } else {
          callback(dir.name, false);
        }
      })
    } else {

      this.processDir(filename, function (dir) {
        analysis.unlink('dir', this.target, dir.name, function () {
          this.emit('unlinked', dir.name);
        })
      })
    }
  })
}

Freud.prototype.stop = function (cb) {
  this.listener.close()
  this.emit('stopped')

  cb && cb()
}

