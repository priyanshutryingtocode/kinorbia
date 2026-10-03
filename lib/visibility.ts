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

// The two arms that mean "visible to anyone". This is a function rather than a
// pair of inline literals because the rule has to be stated exactly once: the
// display and authorization sites need these two arms on their own, while
// `visibleTo` needs them plus "or mine". Written out separately the way this
// used to be, the two spellings agree only by coincidence.
function publicArms(): VisibilityArm[] {
  return [{ visibility: "public" }, { visibility: { $exists: false } }];
}

// Documents anyone may see: explicitly public, or written before `visibility`
// existed. Spread this into a query alongside that query's own keys rather than
// in place of them -- `visibleTo` would be wrong at these call sites, because
// they show a fixed set of documents and must not also surface the viewer's own
// private writing.
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