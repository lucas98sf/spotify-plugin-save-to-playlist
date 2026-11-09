const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { JSDOM, VirtualConsole } = require("jsdom");

test("the installable browser bundle waits for Spicetify, starts once and restores the native control", () => {
  const dom = new JSDOM(
    '<div role="row" data-uri="spotify:track:abc"><button class="main-addButton-button">+</button></div>',
    { runScripts: "outside-only" },
  );
  const source = readFileSync("dist/pinned-playlist-plus.js", "utf8");
  const retries = [];
  dom.window.setTimeout = (callback) => {
    retries.push(callback);
    return 1;
  };
  dom.window.eval(source);
  assert.equal(dom.window.SaveToPlaylist, undefined);
  assert.equal(retries.length, 1);
  let registrations = 0;
  dom.window.Spicetify = {
    Platform: {
      LocalStorageAPI: { getItem: () => ({ mode: "playlist" }), setItem() {} },
      LibraryAPI: {
        getContents: async () => ({
          items: [
            { uri: "spotify:playlist:first", pinned: true, canAddTo: true },
          ],
        }),
        contains: async () => [false],
      },
      PlaylistAPI: { getItem: async () => null },
    },
    Player: { addEventListener() {}, removeEventListener() {} },
    Menu: {
      Item: class {
        register() {
          registrations++;
        }
        deregister() {}
      },
    },
    ReactJSX: { jsx() {} },
    PopupModal: { display() {}, hide() {} },
    showNotification() {},
  };
  retries.shift()();
  const runtime = dom.window.SaveToPlaylist;
  assert.ok(runtime);
  assert.equal(dom.window.PinnedPlaylistPlus, runtime);
  assert.equal(dom.window.document.querySelectorAll(".ppp-controls").length, 1);
  dom.window.eval(source);
  assert.equal(registrations, 1);
  assert.equal(dom.window.SaveToPlaylist, runtime);
  runtime.configure({ enabled: false });
  assert.equal(dom.window.document.querySelectorAll(".ppp-controls").length, 0);
  assert.equal(
    dom.window.document.querySelector("button").hasAttribute("data-ppp-hidden"),
    false,
  );
  runtime.dispose();
  dom.window.close();
});

function installationFixture() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    if (!error.message.includes("Not implemented: navigation")) throw error;
  });
  const dom = new JSDOM("<!doctype html><body></body>", {
    runScripts: "outside-only",
    url: "https://xpui.app.spotify.com/index.html",
    virtualConsole,
  });
  const source = readFileSync("dist/pinned-playlist-plus.js", "utf8");
  let active = 0;
  let modal;
  dom.window.Spicetify = {
    Platform: {
      LocalStorageAPI: { getItem: () => null, setItem() {} },
      LibraryAPI: {
        getContents: async () => ({
          items: [
            {
              uri: "spotify:playlist:first",
              name: "First",
              pinned: true,
              canAddTo: true,
            },
          ],
        }),
        contains: async () => [],
      },
      PlaylistAPI: { getItem: async () => null },
    },
    Player: { addEventListener() {}, removeEventListener() {} },
    Menu: {
      Item: class {
        register() {
          active++;
        }
        deregister() {
          active--;
        }
      },
    },
    ReactJSX: { jsx() {} },
    PopupModal: {
      display(value) {
        modal = value;
      },
      hide() {},
    },
    showNotification() {},
  };
  function script(src) {
    const element = dom.window.document.createElement("script");
    element.src = src;
    dom.window.document.body.append(element);
    return element;
  }
  function load(element) {
    Object.defineProperty(dom.window.document, "currentScript", {
      value: element,
      configurable: true,
    });
    dom.window.eval(source);
    Object.defineProperty(dom.window.document, "currentScript", {
      value: null,
      configurable: true,
    });
  }
  return { dom, script, load, active: () => active, modal: () => modal };
}
const localURL = "/extensions/pinned-playlist-plus.js";
const marketplaceURL =
  "https://cdn.jsdelivr.net/gh/lucas98sf/spotify-plugin-save-to-playlist@v1.3.1/dist/pinned-playlist-plus.js?time=1";

for (const order of ["marketplace-first", "local-first"]) {
  test("local takes precedence with both loader orders: " + order, () => {
    const f = installationFixture();
    try {
      const local = f.script(localURL),
        market = f.script(marketplaceURL);
      if (order === "marketplace-first") {
        f.load(market);
        assert.equal(f.active(), 0);
        f.load(local);
      } else {
        f.load(local);
        f.load(market);
      }
      const runtime = f.dom.window.SaveToPlaylist;
      assert.equal(runtime.installation, "local");
      assert.equal(f.active(), 1);
      f.load(local);
      f.load(market);
      assert.equal(f.active(), 1);
      assert.equal(f.dom.window.SaveToPlaylist, runtime);
      runtime.showSettings();
      assert.match(f.modal().content.textContent, /Version .* · Local/);
      assert.equal(
        f.modal().content.querySelector(".ppp-switch").textContent,
        "Use Marketplace",
      );
    } finally {
      f.dom.window.SaveToPlaylist?.dispose();
      f.dom.window.close();
    }
  });
}

test("a late local copy replaces an already running Marketplace runtime cleanly", () => {
  const f = installationFixture();
  try {
    f.load(f.script(marketplaceURL));
    const marketplace = f.dom.window.SaveToPlaylist;
    assert.equal(marketplace.installation, "marketplace");
    marketplace.showSettings();
    assert.match(f.modal().content.textContent, /Version .* · Marketplace/);
    f.load(f.script(localURL));
    assert.notEqual(f.dom.window.SaveToPlaylist, marketplace);
    assert.equal(f.dom.window.SaveToPlaylist.installation, "local");
    assert.equal(f.dom.window.PinnedPlaylistPlus, f.dom.window.SaveToPlaylist);
    assert.equal(f.active(), 1);
  } finally {
    f.dom.window.SaveToPlaylist?.dispose();
    f.dom.window.close();
  }
});

test("a local copy replaces an older Marketplace runtime without installation metadata", () => {
  const f = installationFixture();
  let disposed = 0;
  try {
    f.dom.window.PinnedPlaylistPlus = {
      version: "1.3.1",
      dispose() {
        disposed++;
      },
    };
    f.load(f.script(localURL));
    assert.equal(disposed, 1);
    assert.equal(f.dom.window.SaveToPlaylist.installation, "local");
    assert.equal(f.dom.window.PinnedPlaylistPlus, f.dom.window.SaveToPlaylist);
    assert.equal(f.active(), 1);
  } finally {
    f.dom.window.SaveToPlaylist?.dispose();
    f.dom.window.close();
  }
});

function rememberSources(f, storage = new Map()) {
  const api = f.dom.window.Spicetify.Platform.LocalStorageAPI;
  api.getItem = (key) => storage.get(key);
  api.setItem = (key, value) => storage.set(key, value);
  return storage;
}
const sourceKey = "pinned-playlist-plus:v1:installation";

for (const order of ["marketplace-first", "local-first"]) {
  test("UI Marketplace preference overrides local priority: " + order, () => {
    const f = installationFixture();
    try {
      rememberSources(f, new Map([[sourceKey, "marketplace"]]));
      const local = f.script(localURL),
        market = f.script(marketplaceURL);
      if (order === "marketplace-first") {
        f.load(market);
        f.load(local);
      } else {
        f.load(local);
        f.load(market);
      }
      assert.equal(f.dom.window.SaveToPlaylist.installation, "marketplace");
      assert.equal(f.active(), 1);
    } finally {
      f.dom.window.SaveToPlaylist?.dispose();
      f.dom.window.close();
    }
  });
}

test("settings switch sources in both directions and preserve account settings across reloads", () => {
  const f = installationFixture();
  try {
    const options = {
      enabled: true,
      separateHeart: false,
      destination: "recently-updated",
    };
    const storage = rememberSources(
      f,
      new Map([["pinned-playlist-plus:v1", options]]),
    );
    const local = f.script(localURL),
      market = f.script(marketplaceURL);
    f.load(local);
    f.load(market);
    f.dom.window.SaveToPlaylist.showSettings();
    let button = f.modal().content.querySelector(".ppp-switch");
    assert.equal(button.textContent, "Use Marketplace");
    assert.equal(button.disabled, false);
    button.click();
    assert.equal(storage.get(sourceKey), "marketplace");
    // Simulate the browser reload after the persisted selection.
    f.dom.window.SaveToPlaylist.dispose();
    f.dom.window.SaveToPlaylist = undefined;
    f.dom.window.PinnedPlaylistPlus = undefined;
    f.load(local);
    f.load(market);
    assert.equal(f.dom.window.SaveToPlaylist.installation, "marketplace");
    f.dom.window.SaveToPlaylist.showSettings();
    button = f.modal().content.querySelector(".ppp-switch");
    assert.equal(button.textContent, "Use local");
    assert.equal(button.disabled, false);
    button.click();
    assert.equal(storage.get(sourceKey), "local");
    f.dom.window.SaveToPlaylist.dispose();
    f.dom.window.SaveToPlaylist = undefined;
    f.dom.window.PinnedPlaylistPlus = undefined;
    f.load(market);
    f.load(local);
    assert.equal(f.dom.window.SaveToPlaylist.installation, "local");
    assert.equal(f.active(), 1);
    assert.equal(storage.get("pinned-playlist-plus:v1"), options);
  } finally {
    f.dom.window.SaveToPlaylist?.dispose();
    f.dom.window.close();
  }
});

test("source switch is disabled until the other copy is installed", () => {
  const f = installationFixture();
  try {
    const storage = rememberSources(f);
    f.load(f.script(localURL));
    f.dom.window.SaveToPlaylist.showSettings();
    const button = f.modal().content.querySelector(".ppp-switch");
    assert.equal(button.disabled, true);
    assert.match(f.modal().content.textContent, /Marketplace once/);
    button.click();
    assert.equal(storage.has(sourceKey), false);
  } finally {
    f.dom.window.SaveToPlaylist?.dispose();
    f.dom.window.close();
  }
});

test("explicit CLI local install overrides the UI choice once, then respects later UI choices", () => {
  const f = installationFixture();
  try {
    const storage = rememberSources(f, new Map([[sourceKey, "marketplace"]]));
    const local = f.script(localURL),
      market = f.script(marketplaceURL);
    f.dom.window.SaveToPlaylistLocalInstallId = "a".repeat(32);
    f.load(local);
    f.load(market);
    assert.equal(f.dom.window.SaveToPlaylist.installation, "local");
    assert.equal(storage.get(sourceKey), "local");
    f.dom.window.SaveToPlaylist.showSettings();
    f.modal().content.querySelector(".ppp-switch").click();
    f.dom.window.SaveToPlaylist.dispose();
    f.dom.window.SaveToPlaylist = undefined;
    f.dom.window.PinnedPlaylistPlus = undefined;
    f.load(local);
    f.load(market);
    assert.equal(f.dom.window.SaveToPlaylist.installation, "marketplace");
    // Running -Local again generates a new marker and explicitly selects local.
    f.dom.window.SaveToPlaylistLocalInstallId = "b".repeat(32);
    f.load(local);
    assert.equal(f.dom.window.SaveToPlaylist.installation, "local");
  } finally {
    f.dom.window.SaveToPlaylist?.dispose();
    f.dom.window.close();
  }
});

test("Marketplace settings offer no local switch when a local copy is absent", () => {
  const f = installationFixture();
  try {
    rememberSources(f);
    f.load(f.script(marketplaceURL));
    assert.equal(f.dom.window.SaveToPlaylist.installation, "marketplace");
    f.dom.window.SaveToPlaylist.showSettings();
    assert.equal(f.modal().content.querySelector(".ppp-switch"), null);
    assert.equal(f.modal().content.textContent.includes("Use local"), false);
    assert.equal(
      f.modal().content.textContent.includes("install.ps1 -Local"),
      false,
    );
  } finally {
    f.dom.window.SaveToPlaylist?.dispose();
    f.dom.window.close();
  }
});
