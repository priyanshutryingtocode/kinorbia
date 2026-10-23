import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isObjectId } from "@/lib/objectId";
import {
  requireCurrentUser,
  AuthenticationRequiredError,
} from "@/lib/authUser";

export async function requireUser() {
  try {
    const user = await requireCurrentUser();
    return {
      email: user.email,
      name: user.name || "KinOrbia user",
    };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/login");
    }
    throw error;
  }
}

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function parseVisibility(formData: FormData): "public" | "private" {
  return getString(formData, "visibility") === "private" ? "private" : "public";
}

export async function requireUserEmail() {
  return (await requireUser()).email;
}

const SLUG = "[a-z0-9_-]{1,64}";
const TMDB_ID = "\\d{1,10}";

function isRevalidatableRoute(path: string) {
  if (path === "/lists" || path === "/profile" || path === "/reviews") {
    return true;
  }

  if (new RegExp(`^/lists/${SLUG}$`).test(path)) {
    return isObjectId(path.slice("/lists/".length));
  }

  if (new RegExp(`^/u/${SLUG}(/followers|/following)?$`).test(path)) {
    return true;
  }

  return new RegExp(`^/(movie|tv)/${TMDB_ID}$`).test(path);
}

export function revalidateRoute(path: string) {
  if (path && isRevalidatableRoute(path)) {
    revalidatePath(path);
  }
}
