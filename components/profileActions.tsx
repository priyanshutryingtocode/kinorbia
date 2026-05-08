"use client";

import { useState } from "react";
import { Settings, Share2, X, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserData {
  name: string;
  bio: string;
  email: string;
}

export default function ProfileActions({ user }: { user: UserData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");

  const router = useRouter();

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });

      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      }
    } catch {
      console.error("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-3 mt-4 md:mt-0">
        <button 
          onClick={() => setIsEditing(true)}
          className="px-6 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition text-sm font-medium flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Edit Profile
        </button>
        
        <button 
          onClick={handleShare}
          className="px-6 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition text-sm font-medium text-red-400 flex items-center gap-2"
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? "Copied!" : "Share"}
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsEditing(false)}
          ></div>

          <div className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-2">Display Name</label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-2">Bio</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={160}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition resize-none"
                  placeholder="Tell us about your movie taste..."
                />
                <p className="text-right text-xs text-neutral-600 mt-1">{bio.length}/160</p>
              </div>

              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition mt-2 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
