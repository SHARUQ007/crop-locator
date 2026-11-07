const { JSDOM } = require("jsdom");
const { buildSync } = require("esbuild");
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
fs.mkdirSync(path.join(root, "outputs/test"), { recursive: true });
buildSync({
  stdin: {
    contents: fs
      .readFileSync(path.join(root, "app/page.tsx"), "utf8")
      .replace(
        /(["'])\.\.\/components\/explorer-map\1/g,
        JSON.stringify(path.join(root, "tests/map-stub.tsx")),
      )
      .replace(
        /(["'])\.\.\/components\/location-detail\1/g,
        JSON.stringify(path.join(root, "tests/detail-stub.tsx")),
      ),
    resolveDir: path.join(root, "app"),
    sourcefile: "page.tsx",
    loader: "tsx",
  },
  outfile: path.join(root, "outputs/test/home.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  packages: "external",
  logLevel: "silent",
});
const dom = new JSDOM('<!doctype html><div id="root"></div>', {
  url: "http://localhost/",
});
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.Event = dom.window.Event;
global.MouseEvent = dom.window.MouseEvent;
global.localStorage = dom.window.localStorage;
global.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
global.fetch = async () => ({ ok: true, json: async () => [] });
global.URL.createObjectURL = () => "blob:demo";
global.URL.revokeObjectURL = () => {};
const React = require("react");
const { createRoot } = require("react-dom/client");
const { act } = React;
const Home = require(path.join(root, "outputs/test/home.cjs")).default;
let app;
async function render() {
  await act(async () => {
    app = createRoot(document.getElementById("root"));
    app.render(React.createElement(Home));
  });
}
const buttons = () => [...document.querySelectorAll("button")];
const button = (text) => {
  const found = buttons().find((b) => b.textContent.trim() === text);
  assert.ok(found, "button not found: " + text);
  return found;
};
async function click(el) {
  await act(async () => {
    el.click();
  });
}
async function input(el, value) {
  const proto =
    el.tagName === "TEXTAREA"
      ? dom.window.HTMLTextAreaElement.prototype
      : el.tagName === "SELECT"
        ? dom.window.HTMLSelectElement.prototype
        : dom.window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(
      new dom.window.Event(el.tagName === "SELECT" ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}
async function submit(form) {
  await act(async () => {
    form.dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}
function label(name) {
  const l = [...document.querySelectorAll("label")].find((l) =>
    l.textContent.trim().startsWith(name),
  );
  assert.ok(l, "label not found: " + name);
  return l.querySelector("input,select,textarea");
}
(async () => {
  localStorage.setItem("cl-location-choice-v1", "Maharashtra");
  localStorage.setItem("cl-onboarded-v1", "true");
  await render();
  assert.equal(document.querySelectorAll(".result-card").length, 6);
  await click(
    buttons().find((b) => b.textContent.includes("01Jalgaon")) ||
      buttons().find(
        (b) =>
          b.textContent.includes("01") && b.textContent.includes("Jalgaon"),
      ),
  );
  assert.ok(
    document.querySelector(".location-below .detail-panel"),
    "intelligence must render below map",
  );
  assert.equal(
    document.querySelector(".detail-panel").closest(".explorer"),
    null,
    "details must not occupy the map container",
  );
  await click(button("Compare details"));
  assert.ok(document.querySelector("dialog[open]"), "detail Compare must open immediately");
  assert.equal(document.querySelectorAll(".comparison-column").length, 1);
  const candidatePicker = document.querySelector('[aria-label="Add comparison candidate"]');
  await input(candidatePicker, [...candidatePicker.options].find((o) => o.value).value);
  assert.equal(document.querySelectorAll(".comparison-column").length, 2);
  await click(document.querySelector('button[aria-label="Close dialog"]'));
  await click(document.querySelector('[aria-label="Undo"]'));
  await click(button("Compare details"));
  assert.equal(document.querySelectorAll(".comparison-column").length, 1, "undo removes the second candidate");
  await click(document.querySelector('button[aria-label="Close dialog"]'));
  await click(document.querySelector('[aria-label="Redo"]'));
  await click(button("Compare details"));
  assert.equal(document.querySelectorAll(".comparison-column").length, 2, "redo restores second candidate");
  await click(document.querySelector('button[aria-label="Close dialog"]'));
  await click(document.querySelector(".tray-clear"));
  const compares = buttons().filter((b) => b.textContent.trim() === "Compare");
  await click(compares[0]);
  await click(compares[1]);
  await click(button("Compare 2"));
  assert.ok(
    document.querySelector("dialog[open]"),
    "comparison dialog must open",
  );
  assert.equal(document.querySelectorAll(".comparison-column").length, 2);
  await click(button("Commercial outlook"));
  assert.match(
    document.querySelector("dialog").textContent,
    /Break-even yield/,
  );
  await click(document.querySelector('button[aria-label="Close dialog"]'));
  await click(document.querySelector('button[aria-label="Create project"]'));
  await input(label("Project name"), "Test sourcing decision");
  await submit(document.querySelector("dialog form"));
  assert.match(
    document.querySelector("h1").textContent,
    /Test sourcing decision/,
  );
  assert.equal(JSON.parse(localStorage.getItem("cl-projects-v1")).length, 4);
  await click(document.querySelector('[aria-label="Undo"]'));
  assert.equal(JSON.parse(localStorage.getItem("cl-projects-v1")).length, 3, "undo persists project removal");
  await click(document.querySelector('[aria-label="Redo"]'));
  assert.equal(JSON.parse(localStorage.getItem("cl-projects-v1")).length, 4, "redo persists project restoration");
  await click(button("Team"));
  await click(button("Invite teammate"));
  await input(label("Work email"), "qa@example.test");
  await submit(document.querySelector("dialog form"));
  assert.match(document.body.textContent, /qa@example.test/);
  assert.match(document.body.textContent, /Pending/);
  assert.equal(JSON.parse(localStorage.getItem("cl-members-v1")).length, 5);
  await click(button("Evidence"));
  await click(button("Add evidence"));
  await input(label("Evidence name"), "QA soil sample");
  await input(
    label("What did you observe?"),
    "12 composite samples; synthetic local trial.",
  );
  await submit(document.querySelector("dialog form"));
  assert.match(document.body.textContent, /QA soil sample/);
  assert.equal(JSON.parse(localStorage.getItem("cl-evidence-v1")).length, 3);
  await click(button("Explore"));
  await click(button("Find crops"));
  assert.equal(document.querySelectorAll(".crop-result").length, 6);
  await click(document.querySelector('[aria-label="Select land"]'));
  await input(document.querySelector('[aria-label="Search countries, regions and locations"]'), "  india jalgaon ");
  assert.equal(document.querySelectorAll(".picker-options button").length, 1, "sample search matches multiple words in any order");
  await click(document.querySelector(".picker-options button"));
  const beforeWater = document.querySelector('[aria-label="Water regime"]').value;
  await input(document.querySelector('[aria-label="Water regime"]'), "irrigated");
  await click(document.querySelector('[aria-label="Undo"]'));
  assert.equal(document.querySelector('[aria-label="Water regime"]').value, beforeWater);
  await click(document.querySelector('[aria-label="Redo"]'));
  assert.equal(document.querySelector('[aria-label="Water regime"]').value, "irrigated");
  await click(document.querySelector('[aria-label="Undo"]'));
  await input(document.querySelector('[aria-label="Growing season"]'), "Rabi");
  assert.equal(document.querySelector('[aria-label="Redo"]').disabled, true, "new changes discard redo branch");
  await click(button("Find land"));
  await click(document.querySelector(".location-picker-trigger"));
  await click(document.querySelector(".picker-world"));
  assert.ok(
    document.querySelectorAll(".result-card").length >= 20,
    "global discovery must offer worldwide sample areas",
  );
  await click(button("2050s"));
  assert.match(
    document.querySelector(".context-line").textContent,
    /2046–2065/,
  );
  await act(async () => app.unmount());
  localStorage.clear();
  await render();
  assert.match(document.querySelector("h1").textContent, /Good decisions/);
  await click(button("Continue"));
  await input(label("First project"), "Onboarded decision");
  await click(button("Continue"));
  await click(document.querySelector(".location-picker-trigger"));
  await click(
    [...document.querySelectorAll(".picker-options button")].find((b) =>
      b.textContent.startsWith("India"),
    ),
  );
  await click(button("Open my workspace"));
  assert.equal(localStorage.getItem("cl-onboarded-v1"), "true");
  assert.equal(
    JSON.parse(localStorage.getItem("cl-projects-v1"))[0].name,
    "Onboarded decision",
  );
  await act(async () => app.unmount());
  console.log(
    "PASS: undo/redo for exploration and persisted project edits, redo branch reset, detail comparison picker, token-based sample search, below-map detail placement, two-candidate comparison dialog, economic comparison, project creation/persistence, simulated invitations, evidence creation, crop discovery, time context and complete onboarding, searchable location picker and global discovery. Map rendering itself is covered by manual browser review.",
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
