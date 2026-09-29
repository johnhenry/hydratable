# Changelog

All notable changes to this project will be documented in this file.

## [0.0.0] - 2026-09-29

Initial release. Extracted as a standalone package from
[`@johnhenry/domkit`](https://github.com/johnhenry/domkit) (`src/mounts/`
and `src/hydratable/`), which had itself extracted both from
[`johnhenry/lib`](https://github.com/johnhenry/lib)'s `js/mounts/0.0.0/`
and `js/hydratable/0.0.0/` directories. Confirmed via `grep` that nothing
remaining in domkit imported either module — a fully self-contained,
zero-cross-reference-cleanup extraction.

- `mounts` — framework-agnostic DOM mount-point helpers: `body`, `first`,
  `last`, and the shared `unsuitable` tag list they consult.
- `hydratable` — a generic async hydration mixin (`Hydratable(hydrateFn,
  name = "hydrate")`), with its `demo.mjs` worked example.

Both modules are ported verbatim, byte-for-byte, from their current
domkit source — no API changes. In particular, `mounts/last.mjs` already
carried a real fix from its time in domkit: an earlier version called
`unsuitable.contains(...)` on the plain `unsuitable` array (`Array` has no
`.contains()` method, only `.includes()`), which threw a `TypeError`
whenever `document.body`'s last child was a real element — i.e. almost
always. That was fixed to `.includes()` in domkit `0.0.2`, before this
extraction; the code ported here already has the fix. See
`test/import.test.mjs` for a regression test covering this exact case
(a real last-child element present when `last.mjs` is imported).

Added, new in this package (did not exist in domkit):

- `test/import.test.mjs` — domkit's own gate for this cluster was
  syntax-only (`node --check`), which cannot catch a bug like the one
  above: `first.mjs`/`last.mjs` execute real DOM-reading code at
  module-evaluation time, not inside a function, so a plain parse check
  never runs that code. This package instead imports every module under a
  minimal `document`/`Node` shim on `globalThis` and asserts on the
  resulting mount element, for both the "reuse existing child" and
  "create and insert a new div" branches of `first`/`last`, plus
  `hydratable`'s double-hydration and direct-prototype-call guards.
- `AGENTS.md` documents the eager-module-evaluation behavior of
  `first.mjs`/`last.mjs` as a first-class gotcha (previously only in
  domkit's own `AGENTS.md`, one bullet among many unrelated modules).
