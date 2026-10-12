"use server";

import { revalidatePath } from "next/cache";
import { getString, revalidateRoute, requireUser } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { applySocialToggle } from "@/features/social/mutations";

const VALID_TYPES = ["review", "list"];
const VALID_ACTIONS = ["like", "save"];

export async function toggleSocialAction(formData: FormData) {
  const { email, name } = await requireUser();
  const type = getString(formData, "type");
  const id = getString(formData, "id");
  const action = getString(formData, "action");
  const path = getString(formData, "path");

  if (!id || !isObjectId(id) || !VALID_TYPES.includes(type) || !VALID_ACTIONS.includes(action)) {
    return;
  }

  try {
    const hasValue = await applySocialToggle({
      actorEmail: email,
      actorName: name,
      targetId: id,
      targetType: type as "review" | "list",
      action: action as "like" | "save",
    });

    if (hasValue === null) {
      return;
    }
  } catch (error) {
    console.error("Error updating social action:", error);
    return;
  }

  // The caller tells us which surface it was triggered from; the helper checks
  // that against the routes this app actually owns.
  revalidateRoute(path);

  if (type === "list") {
    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);
  } else {
    revalidatePath("/reviews");
    revalidatePath("/profile");
  }
}