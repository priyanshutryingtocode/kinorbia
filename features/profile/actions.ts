"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getString, revalidateRoute } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { isEmailVerified, VERIFICATION_REQUIRED_MESSAGE } from "@/lib/verification";
import { applyFollow } from "@/features/profile/mutations";

export type FollowState = { error?: string } | undefined;

function isRelevantPath(path: string) {
  return /^\/(?:profile|activity|u\/[a-z0-9_-]+(?:\/(?:followers|following))?)$/.test(path);
}

function addUserPaths(paths: Set<string>, username?: string | null) {
  if (!username || !/^[a-z0-9_-]+$/i.test(username)) {
    return;
  }

  paths.add(`/u/${username}`);
  paths.add(`/u/${username}/followers`);
  paths.add(`/u/${username}/following`);
}

export async function toggleFollow(_prevState: FollowState, formData: FormData): Promise<FollowState> {
  const { email, name } = await requireUser();
  const targetUserId = getString(formData, "targetUserId");
  const operation = getString(formData, "operation") === "unfollow" ? "unfollow" : "follow";
  const submittedPath = getString(formData, "path");

  if (!isObjectId(targetUserId)) {
    return;
  }

  // A follow puts your name in someone else's public follower list, so it is gated like any
  // other public appearance. Unfollow is never gated: a member must always be able to withdraw.
  if (operation === "follow" && !(await isEmailVerified(email))) {
    return { error: VERIFICATION_REQUIRED_MESSAGE };
  }

  let outcome: Awaited<ReturnType<typeof applyFollow>>;

  try {
    outcome = await applyFollow({
      actorEmail: email,
      actorName: name,
      targetUserId,
      operation,
    });
  } catch (error) {
    console.error("Error toggling follow:", error);
    return;
  }

  if (outcome.outcome !== "changed") {
    return;
  }

  const relevantPaths = new Set<string>(["/profile"]);
  if (isRelevantPath(submittedPath)) {
    relevantPaths.add(submittedPath);
  }
  addUserPaths(relevantPaths, outcome.actorUsername);
  addUserPaths(relevantPaths, outcome.targetUsername);

  for (const path of relevantPaths) {
    // Entries are either derived from the two usernames or supplied by the
    // caller, so both go through the same check rather than trusting the Set.
    revalidateRoute(path);
  }
  revalidatePath("/activity");
}