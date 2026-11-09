import { ICONS } from "./constants";

const savedElsewhereIcon = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${ICONS.checkOutline}</svg>`,
);

export const STYLES = `
    [data-ppp-hidden] { display: none !important; }
    .ppp-controls { display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; }
    .ppp-controls[hidden], .ppp-button[hidden] { display: none !important; }
    .ppp-button { box-sizing: border-box; background: transparent; border: 0; color: var(--spice-subtext, #b3b3b3); cursor: pointer; padding: 4px; width: 24px; height: 32px; display: inline-flex; align-items: center; justify-content: center; }
    [data-ppp-native] { box-sizing: border-box !important; width: 24px !important; min-width: 24px !important; height: 32px !important; min-height: 32px !important; padding: 4px !important; margin: 0 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; position: relative; }
    [data-ppp-native] svg { width: 16px !important; height: 16px !important; }
    [data-ppp-native][data-ppp-membership="target"] { color: var(--spice-button, #1ed760) !important; }
    [data-ppp-native][data-ppp-membership="target"] svg { color: var(--spice-button, #1ed760) !important; }
    [data-ppp-native][data-ppp-membership="other"] { color: var(--spice-subtext, #b3b3b3) !important; }
    [data-ppp-native][data-ppp-membership="other"] svg { opacity: 0; }
    [data-ppp-native][data-ppp-membership="other"]::after { content: ""; position: absolute; width: 16px; height: 16px; background: currentColor; mask: url("data:image/svg+xml,${savedElsewhereIcon}") center / contain no-repeat; pointer-events: none; }
    .ppp-button:hover { color: var(--spice-text, #fff); }
    .ppp-button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    .ppp-button[aria-pressed="true"] { color: var(--spice-button, #1ed760); }
    .ppp-button:disabled { opacity: .5; cursor: wait; }
    .ppp-added > svg { animation: ppp-save-pop .45s ease-out; transform-origin: center; }
    @keyframes ppp-save-pop { 0% { transform: scale(.65) rotate(-20deg); } 45% { transform: scale(1.3) rotate(8deg); } 75% { transform: scale(.95); } 100% { transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .ppp-added > svg { animation: none; } }
    .ppp-tooltip { color: var(--spice-text, #fff); background-color: var(--spice-card, #282828); text-overflow: ellipsis; -webkit-line-clamp: 4; -webkit-box-orient: vertical; border-radius: 4px; max-width: 50ch; padding: 4px 8px; display: -webkit-box; overflow: hidden; box-shadow: 0 16px 24px #0000004d, 0 6px 8px #0003; font-size: 14px !important; animation: ppp-tooltip-in .2s ease-in-out; }
    @keyframes ppp-tooltip-in { from { opacity: 0; } to { opacity: 1; } }
    .ppp-settings { display: grid; gap: 18px; padding: 8px; }
    .ppp-settings label { display: grid; gap: 8px; }
    .ppp-settings label.ppp-toggle { display: flex; align-items: center; gap: 10px; }
    .ppp-inline-symbol { font-family: Arial, "Segoe UI Symbol", sans-serif; font-size: 1.1em; font-weight: 400; line-height: 1; margin-inline: .12em; vertical-align: -.03em; }
    .ppp-settings select { appearance: none; width: 100%; min-height: 44px; padding: 10px 44px 10px 12px; background-color: var(--spice-card, #282828); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23b3b3b3' d='M3.47 5.47a.75.75 0 0 1 1.06 0L8 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; color: var(--spice-text, #fff); border: 1px solid var(--spice-subtext, #777); border-radius: 4px; font: inherit; font-size: 14px; cursor: pointer; }
    .ppp-settings select:hover { border-color: var(--spice-text, #fff); }
    .ppp-settings select:focus-visible { outline: 2px solid var(--spice-text, #fff); outline-offset: 2px; }
    .ppp-settings-actions { display: flex; justify-content: flex-end; padding-top: 6px; }
    .ppp-save { border: 0; border-radius: 9999px; padding: 12px 24px; background: var(--spice-button, #1ed760); color: var(--spice-main, #121212); font: inherit; font-weight: 700; cursor: pointer; }
    .ppp-save:hover { transform: scale(1.04); filter: brightness(1.06); }
    .ppp-save:active { transform: scale(1); }
    .ppp-save:focus-visible { outline: 3px solid var(--spice-text, #fff); outline-offset: 3px; }
    .ppp-save:disabled { opacity: .5; cursor: wait; transform: none; }
    .ppp-update-actions { display: flex; align-items: center; gap: 16px; font-size: 13px; }
    .ppp-update, .ppp-switch { background: transparent; border: 0; padding: 0; color: var(--spice-subtext, #b3b3b3); font: inherit; cursor: pointer; }
    .ppp-update:hover, .ppp-switch:hover { color: var(--spice-text, #fff); text-decoration: underline; }
    .ppp-update:focus-visible, .ppp-switch:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
    .ppp-update:disabled, .ppp-switch:disabled { opacity: .5; cursor: not-allowed; }
    .ppp-switch { justify-self: start; }
    .ppp-update-actions a { color: var(--spice-subtext, #b3b3b3); }
    .ppp-settings p { margin: 0; line-height: 1.5; }
  `;
