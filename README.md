FREUD.js
====
----
Listens to `source` for files with relevant extensions and renders them to `target`.

Supported extensions:
* `.md` parsed as [Markdown](http://daringfireball.net/projects/markdown/syntax) using [node-markdown](https://github.com/andris9/node-markdown) into HTML.
* `.jade` parsed as [jade](http://jade-lang.com/) using the [official jade node.js module](https://github.com/visionmedia/jade) into HTML. Jade files are rendered with a `freud` object that contains an array of posts as well as the version string. Each post in the array is formatted as follows:
    {
      "title": "The Blog Entry Title",
      "createdAt": *(creation time)*,
      "updatedAt": *(update time)*
    }

Further configuration options:
* `destructive` automatically unlink any rendered file if the precompiled counterpart is removed.
* `moveRest` link files that do not match compile-ready extensions into target directory. In the case of collisions, the freud-rendered file will be favored.
Note: this creates a *symlink* rather than a *copy*