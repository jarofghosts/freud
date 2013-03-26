var fs = require('fs'),
  sourceDirectory = '/home/jarofghosts',
  targetDirectory = '/home/jarofghosts/flog';

fs.watch(sourceDirectory, { persistent: true }, function (event, filename) {
  if (!filename.match(/^\./) && filename.match(/\.md$/)) {
    console.log('event = ' + event + ', filename = ' + filename);
  }
});