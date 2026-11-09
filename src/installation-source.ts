import { KEY, REPO, LEGACY_REPO } from "./constants";
import type { Installation, SpicetifyHost } from "./types";

const PREFERENCE_KEY = `${KEY}:installation`;
const LOCAL_INSTALL_KEY = `${KEY}:local-install-id`;

/** An explicit CLI install selects local once; later UI choices remain durable. */
export function registerLocalInstall(S: SpicetifyHost, id: string | undefined) {
  if (!id || !/^[a-f0-9]{32}$/.test(id)) return;
  try {
    const storage = S.Platform.LocalStorageAPI;
    if (storage.getItem(LOCAL_INSTALL_KEY) === id) return;
    storage.setItem(PREFERENCE_KEY, "local");
    storage.setItem(LOCAL_INSTALL_KEY, id);
  } catch (error) {
    console.warn("Could not save the local installation selection", error);
  }
}

export function installationForScript(src: string): Installation {
  return [REPO, LEGACY_REPO].some(
    (repo) => src.includes(`/${repo}/`) || src.includes(`/${repo}@`),
  )
    ? "marketplace"
    : "local";
}

export function hasInstallation(doc: Document, source: Installation): boolean {
  return [...doc.scripts].some((script) => {
    if (source === "marketplace")
      return installationForScript(script.src) === "marketplace";
    try {
      const url = new URL(script.src, doc.baseURI);
      return (
        url.origin === new URL(doc.baseURI).origin &&
        url.pathname.endsWith("/extensions/pinned-playlist-plus.js")
      );
    } catch {
      return false;
    }
  });
}

export function preferredInstallation(S: SpicetifyHost): Installation | null {
  try {
    const source = S.Platform.LocalStorageAPI.getItem(PREFERENCE_KEY);
    return source === "local" || source === "marketplace" ? source : null;
  } catch {
    return null;
  }
}

export function selectInstallation(
  S: SpicetifyHost,
  doc: Document,
  source: Installation,
) {
  if (!hasInstallation(doc, source))
    throw new Error(
      source === "marketplace"
        ? "Install Save to Playlist from Marketplace once, then reopen settings."
        : "Install the local copy with install.ps1 -Local once, then reopen settings.",
    );
  S.Platform.LocalStorageAPI.setItem(PREFERENCE_KEY, source);
}
