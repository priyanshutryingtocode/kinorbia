"use server";

import { resolveActionArgs, withState, type ActionState } from "@/lib/actionState";
import { requireUser, getString, revalidateRoute } from "@/lib/actions";
import { rateLimit } from "@/lib/rateLimit";
import { isObjectId } from "@/lib/objectId";
import { isEmailVerified, VERIFICATION_REQUIRED_MESSAGE } from "@/lib/verification";
import { postComment, removeComment, MAX_COMMENT_LENGTH } from "@/features/comments/mutations";

const VALID_PARENTS = ["review", "list"];

export async function createComment(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email, name } = await requireUser();

  if (!(await rateLimit(`comments:${email}`, { limit: 10, windowMs: 60 * 1000 }))) {
    return withState(state, "error", "You are commenting too quickly. Try again shortly.");
  }

  const parentType = getString(resolvedFormData, "parentType");
  const parentId = getString(resolvedFormData, "parentId");
  const body = getString(resolvedFormData, "body");
  const path = getString(resolvedFormData, "path");

  if (!VALID_PARENTS.includes(parentType) || !isObjectId(parentId) || !body) {
    return withState(state, "error", "Write a comment before posting.");
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    return withState(state, "error", "Comments must be 500 characters or fewer.");
  }

  // Every commentable parent is public by definition (the mutation's lookup matches
  // only what `publiclyVisible` allows), so a comment is always public content.
  if (!(await isEmailVerified(email))) {
    return withState(state, "error", VERIFICATION_REQUIRED_MESSAGE);
  }

  const result = await postComment({
    authorEmail: email,
    authorName: name,
    parentType: parentType as "review" | "list",
    parentId,
    body,
  });

  if (!result.ok) {
    return result.reason === "parent-unavailable"
      ? withState(state, "error", "This discussion is no longer available.")
      : withState(state, "error", "Your comment could not be posted. Please try again.");
  }

  revalidateRoute(path);
  return withState(state, "success", "Comment posted.");
}

export async function deleteComment(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();
  const commentId = getString(resolvedFormData, "commentId");
  const path = getString(resolvedFormData, "path");

  if (!isObjectId(commentId)) {
    return withState(state, "error", "This comment could not be found.");
  }

  try {
    const result = await removeComment({ actorEmail: email, commentId });

    if (result === "not-found") {
      return withState(state, "error", "This comment is no longer available.");
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
    return withState(state, "error", "Your comment could not be deleted. Please try again.");
  }

  revalidateRoute(path);
  return withState(state, "success", "Comment deleted.");
}