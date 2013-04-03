var fs = require('fs'),
  config = require('../config.json'),
  sourceDirectory = config.source,
  targetDirectory = config.target,
  md = require('node-markdown').Markdown;

sourceDirectory += config.source.match(/\/$/) ? '' : '/';
targetDirectory += config.target.match(/\/$/) ? '' : '/';

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
    var outputFile = filename.replace(/\.md$/, '.html');
    callback(outputFile, md(data));
  });
};

exports.renderFile = renderFile;
exports.parseMarkdown = parseMarkdown;
exports.sourceDirectory = sourceDirectory;
exports.targetDirectory = targetDirectory;