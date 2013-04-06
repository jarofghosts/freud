var fs = require('fs'),
  config = require('../config.json'),
  sourceDirectory = config.source,
  targetDirectory = config.target,
  destructive = config.destructive,
  moveRest = config.moveRest,
  posts = [];

sourceDirectory += config.source.match(/\/$/) ? '' : '/';
targetDirectory += config.target.match(/\/$/) ? '' : '/';
