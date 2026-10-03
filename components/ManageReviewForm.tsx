import { updateReview, deleteReview } from "@/app/(root)/reviews/actions";
import type { ReviewItem } from "@/types";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import VisibilityField from "./VisibilityField";

export default function ManageReviewForm({ review }: { review: ReviewItem }) {
  const bodyId = `review-body-${review._id}`;

  return (
    <details className="mt-4 border-t border-rule pt-3">
      <summary className="kin-focus w-fit cursor-pointer rounded-control text-overline font-medium uppercase tracking-overline text-content-muted transition-colors hover:text-highlight">
        Manage review
      </summary>
      <ActionForm action={updateReview} successMessage="Review updated." className="kin-form-stack mt-3">
        <input type="hidden" name="reviewId" value={review._id} />
        <div className="kin-field">
          <label htmlFor={bodyId} className="kin-label">
            Review
          </label>
          <textarea
            id={bodyId}
            name="body"
            required
            maxLength={1200}
            rows={4}
            defaultValue={review.body}
            className="kin-input resize-y"
          />
        </div>
        {/* Was a hand-rolled <select>, while the lists and reviews forms both use
            VisibilityField. Note this changes the control: that component renders
            two radios in a fieldset, not a dropdown. Both post name="visibility",
            so the action is unaffected, and every form now sets visibility the
            same way. */}
        <VisibilityField legendClassName="kin-label" fieldsetClassName="kin-field" visibility={review.visibility} />
        <label className="kin-choice">
          <input type="checkbox" name="spoiler" defaultChecked={review.spoiler} />
          Contains spoilers
        </label>
        <SubmitButton pendingLabel="Saving..." variant="secondary" className="w-full sm:w-auto">
          Save review
        </SubmitButton>
      </ActionForm>
      <ActionForm action={deleteReview} successMessage="Review deleted." className="mt-3">
        <input type="hidden" name="reviewId" value={review._id} />
        <SubmitButton
          pendingLabel="Deleting..."
          variant="danger"
          confirmText="Delete this review?"
          className="w-full sm:w-auto"
        >
          Delete review
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
