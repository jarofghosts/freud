var fs = require('fs');

function Freud(source, target) {

  this.source = source + (source.match(/\/$/) ? '' : '/');
  this.target = target + (target.match(/\/$/) ? '' : '/');
  this.rules = [];
  this.processing = [];

  return this;

}

Freud.prototype.listen = function (extension, callback) {

  this.rules[extension] = this.rules[extension] || [];
  this.rules[extension].push(callback);

};

Freud.prototype.go = function () {

  fs.watch(this.source, { persistent: true }, function (event, filename) {
    /* We ignore dotfiles and any file already processing in the stack */
    if (filename.match(/^\./) || !-this.processing.indexOf(filename)) {

      getFile(this.source, filename, function (file) {
        this.rules[file.extension].forEach(function (callback) {
          callback(file);
        });
        putFile(this.target, file);
      });

    }

  });

};

function getFile(directory, filename, callback) {

  var fileObject = {
    "name": filename,
    "fullPath": directory + filename
  };

  fs.readFile(fileObject.fullPath, { encoding: 'utf8' }, function (err, data) {

    fileObject.data = data;

    fs.stat(fileObject.fullPath, function (err, stats) {

      fileObject.stats = stats;
      callback(fileObject);

    });

  });
}

function putFile(directory, file) {
  fs.writeFile(directory + file.name, file.data, function (err) {
    if (err) { throw err; }

    console.log(directory + file.name  + ' rendered');

  });
}

exports.Freud = Freud;