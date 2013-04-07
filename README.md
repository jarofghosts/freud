FREUD.js
====
----

Freud watches directories and copies files between them. It allows you to mutate the file information before rendering used callbacks attached to routes that look up the file extension.

Err that's confusing, here's an example:

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

That will watch `/home/me` for files with the `.md` extension and intercept the copy to rename the file with a `.html` extension.

The file object available within your listen statements is of structure:
```js
{
  "name": "example.txt",
  "stats": (node fs.Stats object),
  "data": "the file contents",
  "write": true
}
```

If the `file.write` property is set to false, Freud will not write it to the target directory.

Freud will also emit certain events that may be useful, such as:
* `started` when the service begins watching.
* `extensionAdded` whenever a new extension is being listened for.
* `processing` whenever a valid (does not begin with '.' or end with '~' and is not currently in the processing queue) file change event is caught.
* `processed` after a file has been processed and written to the target directory.
* `unlinked` when a file has been unlinked due to removal of the file in the source directory.