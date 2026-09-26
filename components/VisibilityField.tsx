type Visibility = "public" | "private";

type VisibilityFieldProps = {
  // Class strings differ per form, so they stay props rather than being
  // normalized here.
  legendClassName: string;
  fieldsetClassName?: string;
  // Omit to default to public.
  visibility?: Visibility;
};

export default function VisibilityField({
  legendClassName,
  fieldsetClassName,
  visibility,
}: VisibilityFieldProps) {
  return (
    <fieldset className={fieldsetClassName}>
      <legend className={legendClassName}>Visibility</legend>
      <div className="kin-choice-group">
        <label className="kin-choice">
          <input
            type="radio"
            name="visibility"
            value="public"
            defaultChecked={visibility === undefined || visibility === "public"}
          />
          Public
        </label>
        <label className="kin-choice">
          <input
            type="radio"
            name="visibility"
            value="private"
            defaultChecked={visibility === "private"}
          />
          Private
        </label>
      </div>
    </fieldset>
  );
}
