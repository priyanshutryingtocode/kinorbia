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

  return (
    <form action={toggleSocialAction}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="path" value={path} />
      <SubmitButton
        pendingLabel="..."
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
          active
            ? action === "like"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
            : "border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className={`h-3.5 w-3.5 ${active ? "fill-current" : ""}`} />
        {count}
      </SubmitButton>
    </form>
  );
}
