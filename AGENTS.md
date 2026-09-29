# Agent playbook

`@johnhenry/hydratable` — a generic async hydration mixin (`hydratable`),
plus framework-agnostic DOM mount-point helpers (`mounts`) for handing a
real element to React/Vue/Solid's render entrypoint. One small npm
package, one subpath export per module (`"./*": "./src/*"`) — no shared
barrel, no build step; source ships as-is (`src/hydratable/index.mjs`,
`src/mounts/{body,first,last,unsuitable}.mjs`).

`CLAUDE.md` in this directory is a symlink to this file.

## The verification loop (before every push)

1. `npm test` — runs `node scripts/check-syntax.mjs` (parse-only, all of
   `src/`) then `node test/import.test.mjs` (actually imports every
   module under a minimal `document`/`Node` shim; see the gotcha below
   for why the syntax check alone is not enough for this package).
2. A genuinely fresh clone: `git clone . /tmp/hydratable-verifyN && cd $_
   && npm ci && npm test`.
3. `npm pack --dry-run` — confirm the file list includes `src/` (and only
   `src/`, per `package.json`'s `files`).

## Repo-specific gotchas

- **`mounts/first.mjs` and `mounts/last.mjs` execute real DOM-reading
  code — `window.document.body.firstChild`/`.lastChild`, and potentially
  `document.createElement` + `prepend`/`append` — at module-evaluation
  time, directly in the module body, not inside an exported function.**
  The resolved (or newly created) element becomes the module's `default`
  export the moment it's first imported. Do not "fix" this into a lazy
  function — it's documented, intentional behavior (see README's
  `### Gotcha` section) carried forward unchanged from `johnhenry/lib` and
  then `@johnhenry/domkit`. Consequences worth remembering:
  - `document.body` must exist and already be in the desired state
    *before* either module is imported — a bundler that hoists imports,
    or a barrel file, can cause the DOM read/mutation to happen earlier
    than intended.
  - ESM modules only evaluate once: re-importing `first.mjs`/`last.mjs`
    anywhere else in the same module graph returns the *same* cached
    export, without re-inspecting `document.body`.
  - `test/import.test.mjs` works around ESM's single-evaluation caching
    by appending a unique `?shim=N` query string to each import, which
    Node treats as a distinct module record — this is the only way to
    re-trigger that top-level code per test scenario, since a second
    plain `import` of the same specifier is a no-op.
- **`mounts/last.mjs` had a real, since-fixed bug from its time in
  `domkit`: it used to call `unsuitable.contains(...)` on the plain
  `unsuitable` array.** `Array` has no `.contains()` method (that's
  `Node`/`DOMTokenList`), only `.includes()` — calling it threw a
  `TypeError` whenever `document.body`'s last child was a real element,
  i.e. almost always. Already fixed to `.includes()` before this package
  was extracted (confirmed in the source ported here). This is exactly
  the class of bug a syntax-only check can't catch — see
  `test/import.test.mjs`'s "reuses an existing suitable last child"
  test, which fails loudly if this regresses.
- **No runtime dependencies, on purpose.** This cluster is small and
  self-contained; don't add one without a real reason.

## Definition of done (adding or changing a module)

- `node --check` passes, and `test/import.test.mjs` passes (add a new
  scenario if you touch `mounts` or `hydratable`'s branching logic).
- The module's own section in `README.md` is accurate (real API, a
  working usage example).
- `CHANGELOG.md` has an entry.

## Non-goals

- No bundling/build step — matches how these modules were always
  consumed (`lib`'s raw-URL-import convention, then domkit's subpath
  exports, now this package's).
- No jsdom/happy-dom dependency. The hand-rolled shim in
  `test/import.test.mjs` is deliberately minimal — it exists to exercise
  `first.mjs`/`last.mjs`'s branching logic, not to be a general DOM test
  environment. If a future module needs real DOM fidelity, reconsider
  this decision rather than stretching the shim to cover it.

## Releases

Bump `version` in `package.json` in a PR, add a `CHANGELOG.md` entry,
merge, then `gh release create v<version>` (fires
`.github/workflows/publish.yml`, gated on the full CI suite).
