# Mounts

Using the body or its direct decendents
as mount points is a common pattern
in modern javascript applications ([Solid](https://www.solidjs.com/), [Vue](https://vuejs.org/), [React](https://reactjs.org/), etc.).

We can declaratively abstract this away as imports.

## Usage

### Body

Use body element as a mount point.

Note: Some applications including react, warn against using the body element as a mount point.
Use 'first' or 'last' instead.

```javascript
import { render } from "solid-js/web";
import Application from "./Soild-Application";
import body from "mounts/body.mjs";
render(() => <Application />, body);
```

### First

Use body's first child as a mount point.

Creates and prepends a new 'div' element
if child is "unsuitable" or non-existent.

```javascript
import Application from "./Vue-Application";
import first from "mounts/first.mjs";
Application.mount(first);
```

### Last

Use body's last child as a mount point.

Creates and appends a new 'div' element
if child is "unsuitable" or non-existent.

```javascript
import { createRoot } from "react";
import Application from "./React-Application";
import last from "mounts/last.mjs";
const root = createRoot(last);
root.render(Application);
```

### Unsuitable elements

The following elements are considered "unsuitable" for mounting:

- script
- style
- link
- noscript

## See also

- [`@johnhenry/domable`](https://github.com/johnhenry/domable)'s `domToReact`/`reactToDom` — converting between real DOM and React-element-shaped objects (domkit doesn't vendor its own copy of these; domable's is the maintained one)
- [hydratable](../hydratable/readme.md) — a generic hydration mixin
