// `kin-focus`: the primary action on every auth page had no focus ring. The inputs get one from
// .kin-input, but these buttons were the only Tab-reachable controls showing nothing.
export const AUTH_SUBMIT_CLASS =
  "kin-focus w-full bg-accent hover:bg-accent-hover disabled:opacity-70 disabled:hover:bg-accent text-on-accent font-semibold text-[13px] py-3 rounded-control transition-colors duration-300 flex items-center justify-center gap-2";

export const AUTH_INPUT_ICON_CLASS =
  "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-subtle group-focus-within:text-highlight transition-colors";

export const ICON_BUTTON_CLASS =
  "kin-focus flex h-10 w-10 items-center justify-center rounded-control border border-rule bg-glass text-content-muted transition hover:border-rule-strong hover:bg-surface-raised hover:text-content";

export const FOOTER_LINK_CLASS =
  "kin-focus inline-flex min-h-9 items-center rounded-control px-1 transition hover:text-content";

// The gold on hover, rather than the brighter `--highlight`: gold is the pager's accent
// and `--highlight` is the brand's full-strength gold, which would outshout the active
// page number it is meant to lead the eye to.
export const PAGER_EDGE_CLASS =
  "kin-focus inline-flex min-h-9 items-center gap-1 px-1.5 text-xs font-medium text-content-muted transition-colors hover:text-highlight-muted";

export const PAGER_EDGE_DISABLED_CLASS =
  "inline-flex min-h-9 items-center gap-1 px-1.5 text-xs font-medium text-content-subtle";
