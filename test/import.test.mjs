// first.mjs/last.mjs execute real DOM-reading code at module-evaluation
// time (see AGENTS.md) -- scripts/check-syntax.mjs (a plain `node --check`
// pass) does not exercise that code at all, only parse it. This test
// installs a minimal document/Node shim on globalThis and actually
// imports each module, confirming the top-level DOM-touching code runs
// without throwing and produces the expected mount element -- including
// a regression check for last.mjs's historical `unsuitable.contains is
// not a function` bug (fixed to `.includes()`; see CHANGELOG.md), which
// only manifests when a real element already occupies the mount slot.
import assert from "node:assert/strict";
import { test } from "node:test";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1; // Node.ELEMENT_NODE
    this.children = [];
  }
  prepend(el) {
    this.children.unshift(el);
  }
  append(el) {
    this.children.push(el);
  }
  get firstChild() {
    return this.children[0];
  }
  get lastChild() {
    return this.children[this.children.length - 1];
  }
}

// Installs a fresh fake `window.document` (with the given initial body
// children) on globalThis. mounts/*.mjs read `window.document.body...`
// at import time, so each scenario below needs its own shim installed
// immediately before a cache-busted re-import of the module under test.
const installShim = (initialChildren = []) => {
  const body = new FakeElement("body");
  body.children = initialChildren;
  const document = {
    body,
    createElement: (tag) => new FakeElement(tag),
  };
  globalThis.window = { document };
  globalThis.document = document;
  globalThis.Node = { ELEMENT_NODE: 1 };
  return { document, body };
};

// Node treats each distinct specifier (including query string) as its
// own module record, so a cache-busting query re-runs a module's
// top-level code on every import -- required here since first.mjs/
// last.mjs only read the shimmed document once, at first import.
let n = 0;
const freshImport = (path) => import(`${path}?shim=${n++}`);

test("unsuitable.mjs exports the known unsuitable tag list", async () => {
  const { default: unsuitable } = await freshImport(
    "../src/mounts/unsuitable.mjs"
  );
  assert.deepEqual(unsuitable, ["script", "style", "link", "noscript"]);
});

test("body.mjs exports document.body as-is", async () => {
  const { body } = installShim();
  const { default: mount } = await freshImport("../src/mounts/body.mjs");
  assert.equal(mount, body);
});

test("first.mjs reuses an existing suitable first child", async () => {
  const { body } = installShim([new FakeElement("main")]);
  const { default: mount } = await freshImport("../src/mounts/first.mjs");
  assert.equal(mount, body.children[0]);
  assert.equal(body.children.length, 1);
});

test("first.mjs creates and prepends a div when body is empty", async () => {
  const { body } = installShim([]);
  const { default: mount } = await freshImport("../src/mounts/first.mjs");
  assert.equal(mount.tagName, "DIV");
  assert.equal(body.children[0], mount);
});

test("first.mjs creates and prepends a div when the first child is unsuitable", async () => {
  const { body } = installShim([new FakeElement("script")]);
  const { default: mount } = await freshImport("../src/mounts/first.mjs");
  assert.equal(mount.tagName, "DIV");
  assert.equal(body.children[0], mount);
  assert.equal(body.children.length, 2);
});

test("last.mjs reuses an existing suitable last child (regression: historical Array#.contains() bug)", async () => {
  const { body } = installShim([new FakeElement("div")]);
  const { default: mount } = await freshImport("../src/mounts/last.mjs");
  assert.equal(mount, body.children[0]);
  assert.equal(body.children.length, 1);
});

test("last.mjs creates and appends a div when body is empty", async () => {
  const { body } = installShim([]);
  const { default: mount } = await freshImport("../src/mounts/last.mjs");
  assert.equal(mount.tagName, "DIV");
  assert.equal(body.children[body.children.length - 1], mount);
});

test("last.mjs creates and appends a div when the last child is unsuitable", async () => {
  const { body } = installShim([new FakeElement("style")]);
  const { default: mount } = await freshImport("../src/mounts/last.mjs");
  assert.equal(mount.tagName, "DIV");
  assert.equal(body.children[body.children.length - 1], mount);
  assert.equal(body.children.length, 2);
});

test("hydratable: hydrate() runs, guards double-hydration, and rejects direct prototype calls", async () => {
  const { default: Hydratable } = await freshImport(
    "../src/hydratable/index.mjs"
  );
  let calls = 0;
  const HPrototype = Hydratable(function ({ finalizer }) {
    calls++;
    this.value = this.raw * 2;
    finalizer(Object.freeze);
  });

  await assert.rejects(
    () => HPrototype.hydrate(),
    /must not be called from prototype/
  );

  const instance = Object.setPrototypeOf({ raw: 21 }, HPrototype);
  const hydrated = await instance.hydrate();
  assert.equal(hydrated, instance);
  assert.equal(instance.value, 42);
  assert.equal(calls, 1);

  await instance.hydrate();
  assert.equal(calls, 1); // idempotent -- second call is a no-op
  assert.ok(Object.isFrozen(instance)); // finalizer ran
});
