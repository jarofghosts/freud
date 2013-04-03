var fs = require('fs'),
  config = require('../config.json'),
  sourceDirectory = config.source,
  targetDirectory = config.target,
  destructive = config.destructive,
  md = require('node-markdown').Markdown;

sourceDirectory += config.source.match(/\/$/) ? '' : '/';
targetDirectory += config.target.match(/\/$/) ? '' : '/';

var renderName = function (filename) {
  return filename.replace(/\.md$/, '.html');
};

var renderFile = function (filename, data, callback) {
  fs.writeFile(targetDirectory + filename, data, function (err) {
    if (err) { throw err; }
    console.log(filename + ' rendered.');
    if (callback && callback !== undefined) { callback(); }
  });
};

var parseMarkdown = function (filename, callback) {
  fs.readFile(sourceDirectory + filename, { encoding: 'utf8' }, function (err, data) {
    if (err) { throw err; }
    callback(renderName(filename), md(data));
  });
};

var unlink = function (filename, callback) {

  var fullName = targetDirectory + renderName(filename);

  fs.exists(fullName, function (exists) {
    if (exists) {
      fs.unlink(fullName, function (err) {
        if (err) { throw err; }
        callback(fullName);
      });
    } else {
      callback(fullName);
    }
  });
};

exports.renderFile = renderFile;
exports.parseMarkdown = parseMarkdown;
exports.unlink = unlink;

exports.sourceDirectory = sourceDirectory;
exports.targetDirectory = targetDirectory;
exports.destructive = destructive;