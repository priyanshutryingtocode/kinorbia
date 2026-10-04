type VisibilityArm = Record<string, unknown>;

function publicArms(): VisibilityArm[] {
  return [{ visibility: "public" }, { visibility: { $exists: false } }];
}

export function publiclyVisible() {
  return { $or: publicArms() };
}

export function visibleTo(email: string | null | undefined) {
  const arms = publicArms();

  if (email) {
    arms.push({ userEmail: email });
  }

  return { $or: arms };
}