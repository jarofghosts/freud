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
  "data": "the file contents"
}
```