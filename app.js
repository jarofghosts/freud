var fs = require('fs'),
  md = require('node-markdown').Markdown,
  sourceDirectory = '/home/jarofghosts',
  targetDirectory = '/home/jarofghosts/flog';

var renderFile = function (data, filename) {
  fs.writeFile(filename, md(data), function (err) {
    if (err) { throw err; }
    console.log(filename + ' rendered.');
  });
};

var parseMarkdown = function (filename) {
  fs.readFile(sourceDirectory + '/' + filename, { encoding: 'utf-8' }, function (err, data) {
    if (err) { throw err; }
    var outputFile = filename.replace(/\.md/, '.html');
    renderFile(data, outputFile);
  });
};

fs.watch(sourceDirectory, { persistent: true }, function (event, filename) {
  if (!filename.match(/^\./) && filename.match(/\.md$/)) {
    parseMarkdown(filename);
  }
});