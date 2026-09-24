import { Bookmark, Heart } from "lucide-react";
import { toggleSocialAction } from "@/app/(root)/socialActions";
import SubmitButton from "./SubmitButton";

type SocialActionButtonProps = {
  type: "review" | "list";
  id: string;
  action: "like" | "save";
  count: number;
  active: boolean;
  path: string;
};

export default function SocialActionButton({
  type,
  id,
  action,
  count,
  active,
  path,
}: SocialActionButtonProps) {
  const Icon = action === "like" ? Heart : Bookmark;
  const target = type === "review" ? "review" : "list";
  const verb = action === "like" ? "Like" : "Save";
  const countLabel = count > 0 ? `, ${count} ${action === "like" ? (count === 1 ? "like" : "likes") : count === 1 ? "save" : "saves"}` : "";

  return (
    <form action={toggleSocialAction}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="path" value={path} />
      <SubmitButton
        pendingLabel="..."
        variant="quiet"
        aria-label={`${verb} this ${target}${countLabel}`}
        aria-pressed={active}
        className={`min-h-8 gap-1.5 rounded-control border px-2.5 py-1.5 text-xs ${
          active
            ? action === "like"
              ? "border-accent/30 bg-accent/10 text-red-300 hover:text-red-200"
              : "border-highlight/30 bg-highlight-soft text-highlight hover:text-highlight"
            : "border-rule text-content-subtle hover:text-content"
        }`}
      >
        <Icon className={`h-3.5 w-3.5 ${active ? "fill-current" : ""}`} aria-hidden="true" />
        <span aria-hidden="true">{count}</span>
      </SubmitButton>
    </form>
  );
}
