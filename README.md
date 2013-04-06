FREUD.js
====
----
Listens to `source`, moves them to `target`.

Further configuration options:
* `destructive` automatically unlink any `target` file if the `source` counterpart is removed.
* `moveRest` link files that do not match compile-ready extensions into target directory. In the case of collisions, the freud-rendered file will be favored.
Note: this creates a *symlink* rather than a *copy*