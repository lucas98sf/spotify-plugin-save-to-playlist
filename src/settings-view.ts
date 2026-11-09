import { target, destinationLabel } from "./actions";
import { errorMessage } from "./errors";
import { hasInstallation, selectInstallation } from "./installation-source";
import { VERSION, NAME } from "./constants";
import {
  latestRelease,
  installRelease,
  RELEASES_URL,
  type Release,
} from "./updates";
import type {
  SpicetifyHost,
  Settings,
  ToggleKey,
  Destination,
  Installation,
} from "./types";

export function createSettingsView(
  S: SpicetifyHost,
  doc: Document,
  getSettings: () => Settings,
  configure: (next: unknown) => void,
  installation: Installation,
) {
  const api = S.Platform;
  let settingsMount: HTMLElement | null = null;
  function unmountSettings() {
    if (settingsMount) S.ReactDOM?.unmountComponentAtNode?.(settingsMount);
    settingsMount = null;
  }
  function showSettings() {
    unmountSettings();
    const root = doc.createElement("div");
    root.className = "ppp-settings";
    const help = doc.createElement("p");
    root.append(help);
    const controls = {} as Record<ToggleKey, HTMLInputElement>;
    function caption(text: string) {
      const element = doc.createElement("span");
      for (const part of text.split(/([♥⊕])/)) {
        if (part === "♥" || part === "⊕") {
          const symbol = doc.createElement("span");
          symbol.className = "ppp-inline-symbol";
          symbol.textContent = part;
          element.append(symbol);
        } else element.append(doc.createTextNode(part));
      }
      return element;
    }
    function toggle(key: ToggleKey, text: string) {
      const row = doc.createElement("label");
      row.className = "ppp-toggle";
      const input = doc.createElement("input");
      input.type = "checkbox";
      input.checked = getSettings()[key];
      row.append(input, caption(text));
      root.append(row);
      controls[key] = input;
    }
    toggle("enabled", `Enable ${NAME}`);
    const destinationLabelElement = doc.createElement("label");
    destinationLabelElement.textContent = "Which playlist?";
    const destination = doc.createElement("select");
    destination.setAttribute("aria-label", "Which playlist?");
    for (const value of ["first-pinned", "recently-updated"] as const) {
      const option = doc.createElement("option");
      option.value = value;
      option.textContent = destinationLabel(value);
      destination.append(option);
    }
    destination.value = getSettings().destination;
    destinationLabelElement.append(destination);
    root.append(destinationLabelElement);
    const modeLabel = doc.createElement("label");
    modeLabel.append(caption("What should ⊕ do?"));
    const mode = doc.createElement("select");
    for (const [value, text] of [
      ["playlist", "Save to playlist only"],
      ["both", "Save to playlist AND Liked Songs"],
    ]) {
      const option = doc.createElement("option");
      option.value = value;
      option.textContent = text;
      mode.append(option);
    }
    mode.value = getSettings().mode;
    modeLabel.append(mode);
    root.append(modeLabel);
    toggle(
      "separateHeart",
      "Show a separate ♥ button for Liked Songs alongside ⊕",
    );
    toggle(
      "playlistMenu",
      "Open Spotify’s playlist menu when clicking a saved check",
    );
    toggle(
      "showOtherPlaylists",
      "Show an outlined check for songs saved elsewhere",
    );
    const status = doc.createElement("p");
    status.setAttribute("role", "status");
    root.append(status);
    let requestGeneration = 0;
    function checkDestination() {
      const generation = ++requestGeneration;
      const selected = destination.value as Destination;
      const label = destinationLabel(selected);
      help.textContent = `Save to your ${label.toLowerCase()}.`;
      const prefix = `${label}: `;
      status.textContent = `${prefix}checking…`;
      target(api, selected)
        .then((result) => {
          if (generation !== requestGeneration) return;
          const name = doc.createElement("strong");
          name.textContent = result.name || "Unnamed playlist";
          status.replaceChildren(doc.createTextNode(prefix), name);
        })
        .catch((error) => {
          if (generation !== requestGeneration) return;
          status.textContent = errorMessage(error);
        });
    }
    destination.onchange = checkDestination;
    checkDestination();
    const saveSettings = () => {
      try {
        configure({
          enabled: controls.enabled.checked,
          mode: mode.value,
          destination: destination.value,
          separateHeart: controls.separateHeart.checked,
          playlistMenu: controls.playlistMenu.checked,
          showOtherPlaylists: controls.showOtherPlaylists.checked,
        });
        S.PopupModal.hide();
        S.showNotification(`${NAME} settings saved`);
      } catch (error) {
        status.textContent = errorMessage(error);
      }
    };
    const actions = doc.createElement("div");
    actions.className = "ppp-settings-actions";
    root.append(actions);
    if (
      S.React?.createElement &&
      S.ReactDOM?.render &&
      S.ReactComponent?.ButtonPrimary
    ) {
      settingsMount = actions;
      S.ReactDOM.render(
        S.React.createElement(
          S.ReactComponent.ButtonPrimary,
          {
            buttonSize: "md",
            colorSet: "brightAccent",
            onClick: saveSettings,
          },
          "Save settings",
        ),
        actions,
      );
    } else {
      const save = doc.createElement("button");
      save.type = "button";
      save.className = "ppp-save";
      save.textContent = "Save settings";
      save.onclick = saveSettings;
      actions.append(save);
    }
    const version = doc.createElement("p");
    const marketplace = installation === "marketplace";
    version.textContent = `Version ${VERSION} · ${marketplace ? "Marketplace" : "Local"}`;
    const switchHint = doc.createElement("p");
    const otherInstallation = marketplace ? "local" : "marketplace";
    const canSwitch = hasInstallation(doc, otherInstallation);
    switchHint.textContent = canSwitch
      ? "Switching reloads Spotify. Your settings are preserved."
      : "Install Save to Playlist in Marketplace once to enable UI switching.";
    const switchButton = doc.createElement("button");
    switchButton.type = "button";
    switchButton.className = "ppp-switch";
    switchButton.textContent = marketplace ? "Use local" : "Use Marketplace";
    switchButton.disabled = !canSwitch;
    switchButton.onclick = () => {
      try {
        selectInstallation(S, doc, otherInstallation);
        doc.defaultView?.location.reload();
      } catch (error) {
        switchHint.textContent = errorMessage(error);
      }
    };
    const sourceRow = doc.createElement("div");
    sourceRow.className = "ppp-update-actions";
    sourceRow.append(version);
    if (!marketplace || canSwitch) sourceRow.append(switchButton);
    root.append(sourceRow);
    if (!marketplace || canSwitch) root.append(switchHint);
    const updateStatus = doc.createElement("p");
    updateStatus.setAttribute("role", "status");
    const update = doc.createElement("button");
    update.type = "button";
    update.className = "ppp-update";
    update.textContent = "Check for updates";
    let release: Release | null = null;
    let installed = false;
    update.onclick = async () => {
      if (installed) {
        doc.defaultView?.location.reload();
        return;
      }
      update.disabled = true;
      try {
        if (release && marketplace) {
          await installRelease(release);
          installed = true;
          updateStatus.textContent = `Version ${release.version} selected. Reload Spotify to finish updating. Your settings are preserved.`;
          update.textContent = "Reload Spotify";
        } else {
          release = await latestRelease();
          updateStatus.textContent = release
            ? `Version ${release.version} is available.`
            : `Version ${VERSION} is up to date.`;
          if (release) {
            if (marketplace) update.textContent = `Install v${release.version}`;
            else
              updateStatus.textContent +=
                " For a release download, run install.ps1 -Update; for your working copy, run install.ps1 -Local.";
          }
        }
      } catch (error) {
        updateStatus.textContent = errorMessage(error);
      } finally {
        update.disabled = false;
      }
    };
    const notes = doc.createElement("a");
    notes.href = RELEASES_URL;
    notes.target = "_blank";
    notes.rel = "noopener noreferrer";
    notes.textContent = "Release notes";
    const updateActions = doc.createElement("div");
    updateActions.className = "ppp-update-actions";
    updateActions.append(update, notes);
    root.append(updateStatus, updateActions);
    S.PopupModal.display({ title: NAME, content: root });
  }

  return {
    show: showSettings,
    dispose: unmountSettings,
    cleanDetached() {
      if (settingsMount && !settingsMount.isConnected) unmountSettings();
    },
  };
}
