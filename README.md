# hydratable

[![npm version](https://img.shields.io/npm/v/%40johnhenry%2Fhydratable.svg)](https://www.npmjs.com/package/@johnhenry/hydratable)
[![CI](https://github.com/johnhenry/hydratable/actions/workflows/ci.yml/badge.svg)](https://github.com/johnhenry/hydratable/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/%40johnhenry%2Fhydratable.svg)](LICENSE)

Full documentation: [opensource.johnhenry.me/hydratable](https://opensource.johnhenry.me/hydratable/)

> **Archived.** This package is folded back into
> [`@johnhenry/domkit`](https://github.com/johnhenry/domkit) as of domkit
> `0.0.4` — import `@johnhenry/domkit/hydratable/...` instead. The
> unscoped npm package `@johnhenry/hydratable` is deprecated (not removed)
> and will keep working at its last published version; this repo is
> archived (read-only, not deleted).

A generic async hydration mixin — `Hydratable(hydrateFn)` returns a
prototype object you `Object.assign` onto a class's prototype, adding a
guarded async `hydrate()` method. Also ships `mounts`, the companion this
package also ships: framework-agnostic DOM mount-point helpers for handing
React/Vue/Solid's render entrypoint a real element to mount into.

No runtime dependencies. No build step — modules ship as source.

## Install

```bash
npm install @johnhenry/hydratable
```

## `hydratable` — a generic async hydration mixin

```js
import Hydratable from "@johnhenry/hydratable/hydratable/index.mjs";

const HPrototype = Hydratable(function ({ finalizer }) {
  // `this` is the instance being hydrated. Define hydration here --
  // this example computes and sets a derived property.
  Object.defineProperty(this, "speed", {
    value: this.distance / this.time,
    writible: false,
    enumerable: true,
  });
  // `finalizer` is optional -- if set, it runs *after* the hydrated flag
  // is set, e.g. to freeze the object once hydration is complete.
  finalizer(Object.freeze);
});

const object = Object.setPrototypeOf({ time: 1000, distance: 100 }, HPrototype);
await object.hydrate();   // runs the hydrate function above
await object.hydrate();   // idempotent -- already hydrated, returns immediately
```

`Hydratable(hydrateFn, name = "hydrate")` takes an optional second argument
to change the generated method's name (e.g. `Hydratable(fn, "init")` adds
`init()` instead of `hydrate()`).

Two guards are built in:

- **Double-hydration guard** — a `Symbol("hydrated")` flag is set on the
  instance (not the shared prototype object) after the first successful
  hydration; subsequent calls resolve immediately with `this`, without
  re-running `hydrateFn`.
- **Direct-prototype-call guard** — calling `hydrate()` directly on the
  object returned by `Hydratable(...)` (rather than on something that
  inherits from it) throws `Error: hydrate(...) must not be called from
  prototype`. This catches the mistake of treating the mixin object itself
  as an instance.

See [`src/hydratable/demo.mjs`](src/hydratable/demo.mjs) for a full worked
example, including both `Object.setPrototypeOf` and `Object.create` styles
of attaching the mixin.

## `mounts` — framework-agnostic DOM mount-point helpers

Using `document.body` or one of its direct descendants as a mount point is
a common pattern in modern JavaScript applications
([Solid](https://www.solidjs.com/), [Vue](https://vuejs.org/),
[React](https://reactjs.org/), etc.). `mounts` abstracts that away as
plain imports, so a render call can hand a real element straight to
React/Vue/Solid's entrypoint.

```js
import { render } from "solid-js/web";
import Application from "./Solid-Application";
import body from "@johnhenry/hydratable/mounts/body.mjs";
render(() => <Application />, body);
```

```js
import Application from "./Vue-Application";
import first from "@johnhenry/hydratable/mounts/first.mjs";
Application.mount(first);
```

```js
import { createRoot } from "react-dom/client";
import Application from "./React-Application";
import last from "@johnhenry/hydratable/mounts/last.mjs";
const root = createRoot(last);
root.render(Application);
```

| Module | Description |
|---|---|
| [`mounts/body.mjs`](src/mounts/body.mjs) | `document.body` itself. Note: some frameworks (including React) warn against mounting directly onto `body` — prefer `first`/`last` instead. |
| [`mounts/first.mjs`](src/mounts/first.mjs) | `document.body`'s first child, if it's a real, "suitable" element — otherwise a new `div` is created and prepended. |
| [`mounts/last.mjs`](src/mounts/last.mjs) | `document.body`'s last child, if it's a real, "suitable" element — otherwise a new `div` is created and appended. |
| [`mounts/unsuitable.mjs`](src/mounts/unsuitable.mjs) | The list of tag names `first`/`last` refuse to reuse as a mount point: `script`, `style`, `link`, `noscript`. |

### Gotcha: `first.mjs`/`last.mjs` run at import time, not call time

**`mounts/first.mjs` and `mounts/last.mjs` execute real DOM-reading code —
`window.document.body.firstChild` / `.lastChild`, and potentially
`document.createElement` + `prepend`/`append` — at module-evaluation time,
directly in the module body, not inside an exported function.** The
resolved (or newly created) element is the module's `default` export
itself, computed once, the moment the module is first imported.

This is deliberate, documented behavior, not a bug:

- It means `document.body` must already exist and be in the state you
  want inspected/mutated *before* you `import` either module — importing
  it earlier than you intend (e.g. via a bundler hoisting imports, or a
  barrel file) mutates the DOM at that earlier point instead.
- It also means these two modules are effectively one-shot: importing
  `first.mjs` a second time anywhere in the same module graph returns the
  *same* cached export (ESM modules only evaluate once) — it will not
  re-inspect the DOM or notice if `document.body`'s children changed since
  the first import.
- `mounts/body.mjs` does the same eager read (`window.document.body`) but
  has no conditional logic, so the only consequence is that it can't be
  imported before `document.body` exists.

If you need the resolution logic to run lazily or more than once, don't
import `first`/`last` directly for that — read their (tiny) source and
adapt the pattern into a function you call when you actually want it
evaluated.

## Family

- Originally extracted from [`johnhenry/lib`](https://github.com/johnhenry/lib)'s
  `js/{mounts,hydratable}/0.0.0/` directories, then briefly part of
  [`@johnhenry/domkit`](https://github.com/johnhenry/domkit) (a toolkit of
  independent DOM/HTML-component modules). Both modules were documented in
  domkit as companions to [`@johnhenry/domable`](https://github.com/johnhenry/domable)'s
  DOM⇄React interop functions (`domToReact`/`reactToDom`) — convert a tree
  to/from a React-element-shaped object with domable, then hand the
  resulting rendered or converted tree to one of this package's `mounts`
  helpers (or wrap the object in `hydratable`'s mixin) to actually mount it
  into the page. Extracted again, out of domkit, into this standalone
  package — the two modules form a real, coherent cluster on their own
  (both concerned with getting a rendered/hydrated tree live in the page),
  distinct from domkit's custom-element and shadow-DOM primitives.
- [`@johnhenry/domkit`](https://github.com/johnhenry/domkit) — the
  toolkit these two modules used to live in.
- [`@johnhenry/domable`](https://github.com/johnhenry/domable) — DOM ⇄
  text ⇄ React conversion primitives; `domToReact`/`reactToDom` pair
  naturally with this package's `mounts`/`hydratable`, as described above.

## License

MIT
