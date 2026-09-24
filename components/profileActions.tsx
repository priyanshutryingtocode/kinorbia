"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Check, Loader2, Settings, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import AccessibleDialog from "@/components/AccessibleDialog";
import { useToast } from "@/components/ToastProvider";

type UserData = {
  name: string;
  bio: string;
  username?: string | null;
};

export default function ProfileActions({ user }: { user: UserData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const router = useRouter();
  const { showToast } = useToast();

  const closeDialog = useCallback(() => {
    if (!loading) {
      setIsEditing(false);
      setError("");
      setName(user.name);
      setBio(user.bio || "");
    }
  }, [loading, user.bio, user.name]);

  const handleShare = async () => {
    const url = user.username
      ? `${window.location.origin}/u/${encodeURIComponent(user.username)}`
      : window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("Public profile link copied.", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy the profile link.", "error");
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Could not save your profile. Please try again.");
        return;
      }

      setIsEditing(false);
      showToast("Profile updated.", "success");
      router.refresh();
    } catch {
      setError("Could not save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setError("");
            setName(user.name);
            setBio(user.bio || "");
            setIsEditing(true);
          }}
          className="kin-focus inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-neutral-200 transition hover:border-gold/30 hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Edit profile
        </button>
        {user.username && (
          <button
            type="button"
            onClick={handleShare}
            className="kin-focus inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-200 transition hover:border-red-500/40 hover:bg-red-500/15 hover:text-white"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Share"}
          </button>
        )}
      </div>

      <AccessibleDialog open={isEditing} onClose={closeDialog} titleId="edit-profile-title">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Public identity</p>
            <h2 id="edit-profile-title" className="mt-1 font-display text-2xl font-bold text-white">
              Edit profile
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={loading}
            className="kin-focus rounded-full border border-white/10 bg-white/5 p-2 text-neutral-400 transition hover:text-white disabled:opacity-50"
            aria-label="Close edit profile dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="profile-name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
              Display name
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={1}
              maxLength={60}
              className="kin-focus w-full rounded-lg border border-white/10 bg-neutral-950 px-4 py-3 text-white placeholder:text-neutral-600"
            />
          </div>

          <div>
            <label htmlFor="profile-bio" className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
              Bio
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              maxLength={160}
              className="kin-focus w-full resize-none rounded-lg border border-white/10 bg-neutral-950 px-4 py-3 text-white placeholder:text-neutral-600"
              placeholder="Tell us about your movie taste..."
            />
            <p className="mt-1 text-right text-xs text-neutral-500">{bio.length}/160</p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="kin-focus flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {loading ? "Saving..." : "Save changes"}
          </button>
        </form>
      </AccessibleDialog>
    </>
  );
}
