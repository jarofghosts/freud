FREUD.js
=====
----
Listens to `source` for files with .md extension and renders them as HTML to `target`, as specified in config.json file.

Further configuration options:
* `ignoreDot`: skip rendering of files with leading . (commonly hidden in *nix systems)
* `destructive`: automatically unlink any rendered file if the precompiled counterpart is removed.