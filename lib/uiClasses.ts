// Class strings that were duplicated verbatim across several files, so that
// changing one means changing one place.
//
// These are plain strings rather than components because the markup around them
// genuinely differs -- a submit button needs a spinner in one case and not
// another, an input icon needs a different handler per site. Only the class list
// was repeated, and a repeated class list is a thing that drifts: the auth
// submit button existed as a sixteen-utility string in four files, and the four
// copies had already been edited separately at least once.
//
// They live here, in a scanned source file, rather than beside one of their call
// sites -- Tailwind only emits a utility it finds in source, so moving a string
// somewhere unscanned would delete its CSS silently.

// The primary button on all four auth forms. Not SubmitButton: that reads
// useFormStatus and renders an sr-only live region, and these four pages drive
// their own `loading` state from a client handler. Its padding is py-2 against
// these pages' py-3.5, so swapping them for SubmitButton would be a visual
// change rather than a de-duplication.
export const AUTH_SUBMIT_CLASS =
  "w-full bg-accent hover:bg-accent-hover disabled:opacity-70 disabled:hover:bg-accent text-on-accent font-semibold text-sm py-3.5 rounded-control transition-colors duration-300 flex items-center justify-center gap-2";

// The icon sitting inside an auth input, positioned against the field's padding.
// Five occurrences across login and signup.
export const AUTH_INPUT_ICON_CLASS =
  "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-subtle group-focus-within:text-highlight transition-colors";

// The 40px square glass icon button in the header: the search control, the
// account control and the theme toggle, across Navbar and ThemeToggle.
export const ICON_BUTTON_CLASS =
  "kin-focus flex h-10 w-10 items-center justify-center rounded-control border border-rule bg-glass text-content-muted transition hover:border-rule-strong hover:bg-surface-raised hover:text-content";

// The footer's nav links, and the previous/next edges of the two pagers.
//
// ProfilePagination and PeopleList had four class constants between them and
// three were identical, with one exception: the enabled edge animated
// `transition` in one file and `transition-colors` in the other. Both are
// correct -- the edge only changes colour on hover -- so this settles on the
// explicit one.
export const FOOTER_LINK_CLASS =
  "kin-focus inline-flex min-h-9 items-center rounded-control px-1 transition hover:text-content";

export const PAGER_EDGE_CLASS =
  "kin-focus inline-flex min-h-9 items-center gap-1.5 px-1.5 text-xs font-medium text-content-muted transition-colors hover:text-content";

export const PAGER_EDGE_DISABLED_CLASS =
  "inline-flex min-h-9 items-center gap-1.5 px-1.5 text-xs font-medium text-content-subtle";
