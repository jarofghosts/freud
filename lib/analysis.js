var path = require('path')
  , fs = require('fs')

exports.unlink = unlink
exports.executeRules = executeRules
exports.getFile = getFile
exports.extname = extname

function getFile(directory, filename, callback) {
  var fileObject = {
      name: filename
    , fullPath: path.join(directory, filename)
    , extension: filename.split('.').pop()
    , write: true
  }

  fs.stat(fileObject.fullPath, setStats)
  
  function setStats(err, stats) {
    fileObject.stats = stats

    if(stats && stats.isDirectory()) return callback(fileObject)

    fs.readFile(fileObject.fullPath, 'utf8', setData)
  }

  function setData(err, data) {
    fileObject.data = data || ''

    callback(fileObject)
  }
}

function unlink(directory, filename, callback) {
  var targetFile = path.join(directory, filename)

  fs.exists(targetFile, function(targetExists) {
    if(!targetExists) return callback(null, null)

    fs.unlink(targetFile, function(err) {
      callback(err, filename)
    })
  })
}

function executeRules(rules, file, callback) {
  if(rules && rules.length) {
    rules.forEach(function (rule) {
      file = rule(file)
    })
  }

  return file
}

function extname(filename) {
  var ext = path.extname(filename)

  return ext ? ext.slice(1) : ext
}
