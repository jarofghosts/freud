FREUD.js
====
----
Listens to `source` for files with relevant extensions and renders them to `target`.

Supported extensions:
* `.md` parsed as [Markdown](http://daringfireball.net/projects/markdown/syntax) using [node-markdown](https://github.com/andris9/node-markdown) into HTML.
* `.jade` parsed as [jade](http://jade-lang.com/) using the [official jade node.js module](https://github.com/visionmedia/jade) into HTML.

Further configuration options:
* `ignoreDot` skip rendering of files with leading . (commonly hidden in *nix systems)
* `destructive` automatically unlink any rendered file if the precompiled counterpart is removed.