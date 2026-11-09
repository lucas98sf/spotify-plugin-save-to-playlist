const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve, dirname, basename } = require("node:path");
const { spawnSync } = require("node:child_process");

function installer(mode, failConfig, check) {
  const directory = mkdtempSync(join(tmpdir(), "save-to-playlist-switch-"));
  const file = join(directory, "Extensions", "pinned-playlist-plus.js");
  try {
    mkdirSync(join(directory, "Extensions"));
    writeFileSync(join(directory, "config.ini"), "test configuration");
    writeFileSync(file, "previous local copy");
    writeFileSync(join(directory, "Extensions", "other.js"), "other extension");
    writeFileSync(
      join(directory, "account-settings.json"),
      "preserved settings",
    );
    const args = [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      resolve("test/installer-harness.ps1"),
      "-Installer",
      resolve("install.ps1"),
      "-TestRoot",
      directory,
      "-Mode",
      mode,
    ];
    if (failConfig) args.push("-FailConfig");
    const result = spawnSync(
      process.platform === "win32" ? "powershell.exe" : "pwsh",
      args,
      { encoding: "utf8", timeout: 30000 },
    );
    assert.ifError(result.error);
    const state = JSON.parse(
      readFileSync(join(directory, "result.json"), "utf8").replace(
        /^\uFEFF/,
        "",
      ),
    );
    check({ ...result, state, file, directory });
    assert.equal(
      readFileSync(join(directory, "Extensions", "other.js"), "utf8"),
      "other extension",
    );
    assert.equal(
      readFileSync(join(directory, "account-settings.json"), "utf8"),
      "preserved settings",
    );
  } finally {
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith("save-to-playlist-switch-")
    )
      throw Error("Refusing cleanup outside the installer test directory.");
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const mode of ["local", "default"]) {
  test(`installer ${mode} selects the working bundle without changing other extensions`, () => {
    installer(mode, false, ({ status, stderr, state, file }) => {
      assert.equal(status, 0, stderr);
      const installed = readFileSync(file, "utf8");
      assert.match(installed, /^\/\* Pinned Playlist Plus v/);
      assert.match(
        installed,
        /globalThis\.SaveToPlaylistLocalInstallId = '[a-f0-9]{32}';\n/,
      );
      assert.equal(
        installed.replace(
          /globalThis\.SaveToPlaylistLocalInstallId = '[a-f0-9]{32}';\n/,
          "",
        ),
        readFileSync("dist/pinned-playlist-plus.js", "utf8"),
      );
      assert.deepEqual(state.extensions, [
        "other.js",
        "pinned-playlist-plus.js",
      ]);
      assert.deepEqual(state.calls.at(-1), ["-n", "apply"]);
    });
  });
}
for (const mode of ["marketplace", "uninstall"]) {
  test(`installer ${mode} removes only the local copy and preserves settings`, () => {
    installer(mode, false, ({ status, stderr, state, file }) => {
      assert.equal(status, 0, stderr);
      assert.equal(existsSync(file), false);
      assert.deepEqual(state.extensions, ["other.js"]);
      assert.deepEqual(state.calls.at(-1), ["-n", "apply"]);
    });
  });
}
test("installer keeps the local file when disabling fails", () => {
  installer("marketplace", true, ({ status, state, file }) => {
    assert.notEqual(status, 0);
    assert.equal(readFileSync(file, "utf8"), "previous local copy");
    assert.equal(
      state.calls.some((args) => args.includes("apply")),
      false,
    );
  });
});
test("installer rejects contradictory modes before changing anything", () => {
  installer("conflict", false, ({ status, state, file }) => {
    assert.notEqual(status, 0);
    assert.equal(state.calls.length, 0);
    assert.equal(readFileSync(file, "utf8"), "previous local copy");
  });
});
