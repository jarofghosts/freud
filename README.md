FREUD.js
====
----

Freud watches directories and copies files between them. It allows you to mutate the file information before rendering used callbacks attached to routes that look up the file extension.

Err that's confusing, here:

### example ###

```js
var Freud = require('freud').Freud,
  freud = new Freud('/home/me', '/home/me/html');

freud.listen('md', function (file) {
  file.data = md(file.data);
  file.name = file.name.replace(/\.md$/, '.html');
  return file;
});

freud.go();
```

That will watch `/home/me` for files with the `.md` extension and intercept the copy to rename the file with a `.html` extension. Listen also accepts '\*:before' and '\*:after' to apply to all processing. You can probably guess when they occur. If you add a listener with '\*', it will be pushed onto the \*:before stack.

The file object available within your listen statements is of structure:
```js
{
  "name": "example.txt",
  "stats": (node fs.Stats object),
  "data": "the file contents",
  "write": true
}
```

If the `file.write` property is set to `false` and never reset to `true` at any point in the chain of transformations, Freud will **not** write it to the target directory.

----

### extra info ###

Freud also accepts an optional third parameter of an options object. The options available are as follows:
* `monitorDot` to watch for dotfile changes, default is `false`
* `monitorSquiggle` to watch for files with names ending with ~, such as are common for backups.

Freud will also emit certain events that may be useful, such as:
* `started` when the service begins watching.
* `extensionAdded` whenever a new extension is being listened for.
* `compiling` whenever a valid (does not begin with '.' or end with '~' and is not currently in the processing queue) file change event is caught.
* `compiled` after a file has been processed and written to the target directory.
* `recompiled` after a successful compilation triggered by `freud.recompile(filename)`.
* `blocked` whenever a write to the target has been canceled due to `file.write` being set to `false`.
* `unlinked` when a file has been unlinked due to removal of the file in the source directory.

### license ###

BSD