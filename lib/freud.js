var fs = require('fs');

function Freud(source, target) {

  this.source = source + (source.match(/\/$/) ? '' : '/');
  this.target = target + (target.match(/\/$/) ? '' : '/');
  this.rules = [];

  return this;

}

Freud.prototype.listen = function (extension, callback) {

  this.rules[extension] = this.rules[extension] || [];
  this.rules[extension].push(callback);

};

Freud.prototype.go = function () {

  var rules = this.rules,
    source = this.source,
    target = this.target,
    processing = [];

  fs.watch(source, { persistent: true }, function (event, filename) {

    if (!filename.match(/^\./) && !filename.match(/~$/) && -processing.indexOf(filename)) {

      fs.exists(source + filename, function (inputFileExists) {

        if (inputFileExists) {

          getFile(source, filename, function (file) {

            if (rules[file.extension] !== undefined) {

              rules[file.extension].forEach(function (callback) {
                file = callback(file);
              });

            }
            putFile(target, file);
            processing.splice(processing.indexOf(filename), 1);
          });

        } else {
          unlinkFile(target, filename);
          processing.splice(processing.indexOf(filename), 1);
        }

      });

    }

  });

};

function getFile(directory, filename, callback) {

  var fileObject = {
    "name": filename,
    "fullPath": directory + filename,
    "extension": filename.split('.').pop()
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

function unlinkFile(directory, filename) {
  fs.unlink(directory + filename, function (err) {
    if (err) { throw err; }

    console.log(directory + filename + ' unlinked.');
  });
}

exports.Freud = Freud;