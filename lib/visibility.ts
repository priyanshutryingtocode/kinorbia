export function publiclyVisible() {
  return { visibility: "public" };
}

export function visibleTo(email: string | null | undefined) {
  if (!email) {
    return { visibility: "public" };
  }

  return { $or: [{ visibility: "public" }, { userEmail: email }] };
}