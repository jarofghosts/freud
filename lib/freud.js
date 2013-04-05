var fs = require('fs'),
  config = require('../config.json'),
  sourceDirectory = config.source,
  targetDirectory = config.target,
  destructive = config.destructive,
  moveRest = config.moveRest,
  md = require('node-markdown').Markdown,
  jade = require('jade'),
  posts = [];

sourceDirectory += config.source.match(/\/$/) ? '' : '/';
targetDirectory += config.target.match(/\/$/) ? '' : '/';

var extractTitle = function (filename) {
  // convert filename of something_like_this into Something Like This
  return filename.replace(/_/g, ' ').replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

var updateList = function () {
  posts = [];
  fs.readdir(sourceDirectory, function (err, files) {
    files.forEach(function (file) {
      if (file.match(/\.(md|jade)$/)) {
        fs.stat(sourceDirectory + file, function (err, stats) {
          posts.push({
            "title": extractTitle(file.replace(/\.(md|jade)$/)),
            "createdAt": stats.ctime, // I know, I know... shhh
            "updatedAt": stats.mtime
          });
        });
      }
    });
  });
};

var renderName = function (filename) {
  return filename.replace(/\.(md|jade)$/, '.html');
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

var parseJade = function (filename, callback) {
  fs.readFile(sourceDirectory + filename, { encoding: 'utf8' }, function (err, data) {
    if (err) { throw err; }
    var fn = jade.compile(data);
    callback(renderName(filename), fn({
      "freud": {
        "posts": posts,
        "version": "0.1.1"
      }
    }));
  });
};

var link = function (filename, callback) {
  fs.exists(targetDirectory + filename, function (linkExists) {
    if (!linkExists) {
      fs.symlink(sourceDirectory + filename, targetDirectory + filename, function (err) {
        if (err) { throw err; }
        callback(filename);
      });
    } else {
      callback(filename);
    }
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

exports.updateList = updateList;
exports.renderFile = renderFile;
exports.parseMarkdown = parseMarkdown;
exports.parseJade = parseJade;
exports.link = link;
exports.unlink = unlink;

exports.sourceDirectory = sourceDirectory;
exports.targetDirectory = targetDirectory;
exports.destructive = destructive;
exports.moveRest = moveRest;