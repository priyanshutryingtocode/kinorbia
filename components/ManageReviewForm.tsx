import { updateReview, deleteReview } from "@/app/(root)/reviews/actions";
import SubmitButton from "./SubmitButton";
import type { ReviewItem } from "@/types";

export default function ManageReviewForm({ review }: { review: ReviewItem }) {
  return (
    <details className="mt-4 border-t border-white/10 pt-4">
      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white">
        Manage
      </summary>
      <form action={updateReview} className="mt-4 space-y-3">
        <input type="hidden" name="reviewId" value={review._id} />
        <textarea
          name="body"
          required
          maxLength={1200}
          rows={4}
          defaultValue={review.body}
          className="w-full resize-none rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        />
        <select
          name="visibility"
          defaultValue={review.visibility}
          className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" name="spoiler" defaultChecked={review.spoiler} className="accent-red-600" />
          Contains spoilers
        </label>
        <SubmitButton
          pendingLabel="Saving..."
          className="w-full rounded-lg bg-white/10 py-2 font-bold text-white transition hover:bg-white/15"
        >
          Save Review
        </SubmitButton>
      </form>
      <form action={deleteReview} className="mt-2">
        <input type="hidden" name="reviewId" value={review._id} />
        <SubmitButton
          pendingLabel="Deleting..."
          className="w-full rounded-lg border border-red-500/30 py-2 font-bold text-red-300 transition hover:bg-red-500/10"
        >
          Delete Review
        </SubmitButton>
      </form>
    </details>
  );
}