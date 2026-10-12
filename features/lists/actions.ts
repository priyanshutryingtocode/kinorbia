"use server";

import { revalidatePath } from "next/cache";
import { resolveActionArgs, type ActionState } from "@/lib/actionState";
import { requireUser, getString, parseVisibility } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { MAX_LIST_MOVIES } from "@/lib/bounds";
import { mediaKey, normalizeMediaType } from "@/lib/media";
import { isEmailVerified, VERIFICATION_REQUIRED_MESSAGE } from "@/lib/verification";
import { createList, removeList, updateList } from "@/features/lists/mutations";

// A submitted `movieIds` value is `mediaType:id`, so a member cannot smuggle a
// different title past the picker by editing the value.
function parseMovieRef(value: string) {
  const separator = value.indexOf(":");
  if (separator < 1 || separator === value.length - 1) {
    return null;
  }

  return {
    mediaType: normalizeMediaType(value.slice(0, separator)),
    movieId: value.slice(separator + 1),
  };
}

function selectedKeysFrom(formData: FormData) {
  return new Set(
    formData
      .getAll("movieIds")
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => {
        const ref = parseMovieRef(value);
        return ref ? mediaKey(ref.mediaType, ref.movieId) : null;
      })
      .filter((value): value is string => value !== null)
  );
}

function validateListFields(title: string, description: string): string | null {
  if (!title) {
    return "Add a title for the list.";
  }
  if (title.length > 80) {
    return "List titles must be 80 characters or fewer.";
  }
  if (description.length > 300) {
    return "Descriptions must be 300 characters or fewer.";
  }
  return null;
}

export async function createMovieList(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email, name } = await requireUser();
  const title = getString(resolvedFormData, "title");
  const description = getString(resolvedFormData, "description");
  const visibility = parseVisibility(resolvedFormData);
  const selectedKeys = selectedKeysFrom(resolvedFormData);

  const fieldError = validateListFields(title, description);
  if (fieldError) {
    return { status: "error", message: fieldError };
  }

  try {
    if (visibility === "public" && !(await isEmailVerified(email))) {
      return { status: "error", message: VERIFICATION_REQUIRED_MESSAGE };
    }

    const result = await createList({
      authorEmail: email,
      authorName: name,
      title,
      description,
      visibility,
      selectedKeys,
    });

    if (result === "too-many") {
      return {
        status: "error",
        message: `Choose no more than ${MAX_LIST_MOVIES} titles for a list.`,
      };
    }
    if (result === "failed") {
      return { status: "error", message: "The list could not be created. Please try again." };
    }
  } catch (error) {
    console.error("Error creating list:", error);
    return { status: "error", message: "The list could not be created. Please try again." };
  }

  revalidatePath("/lists");
  return { status: "success", message: "List created." };
}

export async function updateMovieList(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();
  const listId = getString(resolvedFormData, "listId");
  const title = getString(resolvedFormData, "title");
  const description = getString(resolvedFormData, "description");
  const visibility = parseVisibility(resolvedFormData);
  const selectedKeys = selectedKeysFrom(resolvedFormData);

  if (!listId || !isObjectId(listId)) {
    return { status: "error", message: "This list could not be found." };
  }
  const fieldError = validateListFields(title, description);
  if (fieldError) {
    return { status: "error", message: fieldError };
  }

  try {
    // Publishing a previously private list is the moment it becomes visible.
    if (visibility === "public" && !(await isEmailVerified(email))) {
      return { status: "error", message: VERIFICATION_REQUIRED_MESSAGE };
    }

    const result = await updateList({
      authorEmail: email,
      listId,
      title,
      description,
      visibility,
      selectedKeys,
    });

    if (result === "not-found") {
      return { status: "error", message: "This list could not be found." };
    }
    if (result === "too-many") {
      return {
        status: "error",
        message: `Lists can contain no more than ${MAX_LIST_MOVIES} titles.`,
      };
    }
  } catch (error) {
    console.error("Error updating list:", error);
    return { status: "error", message: "The list could not be updated. Please try again." };
  }

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
  return { status: "success", message: "List updated." };
}

export async function deleteMovieList(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();
  const listId = getString(resolvedFormData, "listId");

  if (!listId || !isObjectId(listId)) {
    return { status: "error", message: "This list could not be found." };
  }

  try {
    const result = await removeList({ authorEmail: email, listId });

    if (result === "not-found") {
      return { status: "error", message: "This list could not be found." };
    }
  } catch (error) {
    console.error("Error deleting list:", error);
    return { status: "error", message: "The list could not be deleted. Please try again." };
  }

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
  return { status: "success", message: "List deleted." };
}