var fs = require('fs'),
    path = require('path')

function getFile(directory, filename, callback) {
  var fileObject = {
    name: filename,
    fullPath: path.join(directory, filename),
    extension: filename.split('.').pop(),
    write: true
  }

  fs.stat(fileObject.fullPath, function (err, stats) {
    fileObject.stats = stats
    if (stats && stats.isDirectory()) return callback(fileObject)
    fs.readFile(fileObject.fullPath, 'utf8', function (err, data) {
      fileObject.data = data || ''
      callback(fileObject)
    })
  })

}

function putFile(directory, file, callback) {
  fs.writeFile(path.join(directory, file.name), file.data, function (err) {
    callback(err, file);
  })
}

function unlink(directory, filename, callback) {
  var targetFile = path.join(directory, filename)

  fs.exists(targetFile, function (targetExists) {
    if (!targetExists) return callback(null, null);
    fs.unlink(targetFile, function (err) {
      callback(err, filename)
    })
  })
}

function executeRules(rules, file, callback) {
  if (rules && rules.length) {
    rules.forEach(function (rule) {
      file = rule(file)
    })
  }
  callback(file)
}

exports.unlink = unlink
exports.executeRules = executeRules
exports.putFile = putFile
exports.getFile = getFile
