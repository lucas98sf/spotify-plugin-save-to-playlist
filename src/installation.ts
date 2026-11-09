import { start } from "./runtime";
import {
  hasInstallation,
  preferredInstallation,
  registerLocalInstall,
} from "./installation-source";
import type { Installation, SpicetifyHost } from "./types";

/** Local development wins regardless of which loader finishes first. */
export function activateInstallation(
  S: SpicetifyHost,
  doc: Document,
  installation: Installation,
) {
  const existing = globalThis.SaveToPlaylist || globalThis.PinnedPlaylistPlus;
  if (installation === "local")
    registerLocalInstall(S, globalThis.SaveToPlaylistLocalInstallId);
  const preference = preferredInstallation(S);
  if (installation === "local" && preference === "marketplace") return;
  if (
    installation === "marketplace" &&
    preference !== "marketplace" &&
    (hasInstallation(doc, "local") || existing?.installation === "local")
  )
    return;
  if (existing && existing.installation === installation) return;
  // Older Marketplace runtimes do not expose installation metadata. Replacing
  // one with a local runtime also works before that installed copy is upgraded.
  existing?.dispose();
  const runtime = start(S, doc, installation);
  globalThis.SaveToPlaylist = runtime;
  globalThis.PinnedPlaylistPlus = runtime;
}
