freud.js
====

[![Build Status](http://img.shields.io/travis/jarofghosts/freud.svg?style=flat)](https://travis-ci.org/jarofghosts/freud)
[![npm install](http://img.shields.io/npm/dm/freud.svg?style=flat)](https://www.npmjs.org/package/freud)

Freud watches directories and copies files between them. It allows you to
modify the file information before rendering using callbacks attached to file
extensions.

Err that's confusing, here:

## example

```js
var Freud = require('freud')

var freud = Freud('/home/me/src', '/home/me/html')
  , md = require('md')

freud.listen('md', function (file) {
  file.data = md(file.data)
  file.name = file.name.replace(/\.md$/, '.html')
  return file
})

freud.go()
```

That will watch `/home/me/src` for changes to files with the `.md` extension.
When there is one, it will run the file contents through `md`, our theoretical
Markdown processor, and change the extension to `.html` before dumping the
mutated file into `/home/me/html`. Of course the origin file is never modified
in any way.

Listen also accepts '\*:before' and '\*:after' to apply to all processed files.
You can probably guess when they occur. If you add a listener with '\*', it
will be pushed onto the '\*:before' stack. Listen *also* accepts an array of
extensions to listen for, like:

```js
freud.listen(['md', 'markdown', 'mkd'], parseFileFunction)
```

The file object available within your listen statements is of structure:

```js
{
    name: "example.txt"
  , stats: (node fs.Stats object)
  , data: "the file contents"
  , write: true
}
```

If the `file.write` property is set to `false` and never reset to `true` at any
point in the chain of transformations, Freud will **not** write it to the
target directory.

### note
Freud does **not** watch sub-directories. In order to effectively monitor
multiple directories, you will need to construct multiple Freud objects.

----

## options

Freud also accepts an optional third parameter of an options object. The
options available are as follows:

+ `monitorDot` to watch for dotfile changes, default is `false`
+ `monitorSquiggle` to watch for files with names ending with ~, such as are
  common for backups. Default is `false`
+ `ignoreCase` to not match case on event/listener matching. Default is `false`

## events

Freud will also emit certain events that may be useful, such as:
+ `started` when the service begins watching.
+ `stopped` when service is stopped (via `freud.stop()`)
+ `extensionAdded` whenever a new extension is being listened for.
+ `compiling` whenever a valid (ie not blocked by user monitoring options and
  not a duplicate or temporary file) file change event is caught. The filename
  will be passed.
+ `compiled` after a file has been processed and written to the target
  directory. The *compiled* filename will be passed.
+ `recompiled` after a successful compilation triggered by
  `freud.recompile(filename)`.
+ `blocked` whenever a write to the target has been canceled due to
  `file.write` being set to `false`.
+ `unlinked` when a file has been unlinked due to removal of the file in the
  source directory.
+ `copying` when a file has no rules it will be copied rather than processed
  for better performance.
+ `copied` when copying has occurred.

## license

MIT
