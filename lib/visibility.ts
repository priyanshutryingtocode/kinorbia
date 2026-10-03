// The filter for "documents this visitor is allowed to see".
//
// Reviews and lists are private by default, so the query that decides visibility
// is the only thing standing between a user's private writing and everyone else.
// It was written out by hand in three places -- the lists index, the list detail
// page, and the reviews index -- identically, with nothing naming it, nothing
// typing it, and nothing testing it. That is a bad property for a privacy check
// to have: the three copies agree today by coincidence, not by construction, and
// dropping the `$exists` arm from any one of them would make every legacy private
// document world-readable with no error anywhere.
//
// So it lives here, once, with a name worth grepping for.
//
// Two details that are load-bearing rather than stylistic:
//
// 1. The `$exists` arm. Documents written before `visibility` existed have no
//    such field. Treating "absent" as anything but public would hide every list
//    and review already in the database; treating it as private would expose
//    them. They are treated as public, which is what they were.
//
// 2. The `userEmail` arm is *omitted* when there is no session, rather than being
//    passed `null`. In MongoDB `{ userEmail: null }` matches documents where the
//    field is null **or missing**, so a null would silently widen the match
//    rather than narrow it. Dropping the arm can only ever return less.
type VisibilityArm = Record<string, unknown>;

export function visibleTo(email: string | null | undefined) {
  const arms: VisibilityArm[] = [
    { visibility: "public" },
    { visibility: { $exists: false } },
  ];

  if (email) {
    arms.push({ userEmail: email });
  }

  return { $or: arms };
}