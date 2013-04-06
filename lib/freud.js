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
    if (filename.match(/^\./) || !-processing.indexOf(filename)) {

      getFile(this.source, filename, function (file) {

      });

    }

  });

};

function getFile(directory, filename, callback) {

}

exports.Freud = Freud;