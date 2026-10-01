import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isObjectId } from "@/lib/objectId";

// Guards a server action: redirects anonymous users to login and returns the
// caller's normalized email plus a display-name fallback for denormalized docs.
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return {
    email: session.user.email.toLowerCase(),
    name: session.user.name || "KinOrbia user",
  };
}

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function parseVisibility(formData: FormData): "public" | "private" {
  return getString(formData, "visibility") === "private" ? "private" : "public";
}

// Page-level guard: redirects anonymous visitors to login and returns the
// caller's normalized email. Use only on routes that are always private — the
// public activity feed and public profiles need a nullable variant instead.
export async function requireUserEmail() {
  return (await requireUser()).email;
}

// Every route that can host a comment, like, save, or follow control, and
// therefore the only paths a caller may ask us to revalidate.
//
// The client sends the path because the server genuinely cannot work it out:
// SocialActionButton renders on /lists, /profile and /reviews alike, so liking a
// review from a list card has to refresh /lists, and the server-computed block
// in toggleSocialAction only knows /reviews and /profile. That is a real gap,
// not a redundant field -- which is why this validates rather than deleting.
//
// Validated because revalidatePath cannot read data, but an unchecked path lets
// anyone force cache invalidation on any route in the app. A rejected path is
// simply skipped: the caller still revalidates everything it derives itself, so
// the worst case is one fewer surface refreshed, never a silent no-op.
const SLUG = "[a-z0-9_-]{1,64}";
// TMDB ids are numeric and `safeId` strips anything else before building the
// path, so a media route with letters in it cannot exist.
const TMDB_ID = "\\d{1,10}";

function isRevalidatableRoute(path: string) {
  if (path === "/lists" || path === "/profile" || path === "/reviews") {
    return true;
  }

  if (new RegExp(`^/lists/${SLUG}$`).test(path)) {
    // Same shape `isObjectId` accepts, spelled here so a route this app cannot
    // render is not treated as revalidatable.
    return isObjectId(path.slice("/lists/".length));
  }

  if (new RegExp(`^/u/${SLUG}(/followers|/following)?$`).test(path)) {
    return true;
  }

  return new RegExp(`^/(movie|tv)/${TMDB_ID}$`).test(path);
}

// Revalidates a caller-supplied path when it names a route this app owns.
export function revalidateRoute(path: string) {
  if (path && isRevalidatableRoute(path)) {
    revalidatePath(path);
  }
}
