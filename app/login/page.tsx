"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Mail, Lock, Chrome, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-red-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="relative w-full max-w-130 aspect-square">
        <div className="absolute inset-0 rounded-full shadow-[0_0_100px_-20px_rgba(220,38,38,0.3)] bg-neutral-950"></div>
        <div className="absolute inset-1 rounded-full orb-plasma overflow-hidden opacity-80"></div>
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_15px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.1)] border border-white/5"></div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 z-10 text-center backdrop-blur-sm rounded-full">
          <Link href="/" className="flex items-center gap-2 group mb-6 hover:scale-105 transition-transform">
            <Film className="w-8 h-8 text-red-500" />
            <span className="text-3xl font-bold tracking-tighter text-white">
              Kin<span className="text-red-500">Orbia</span>
            </span>
          </Link>

          <div className="w-full max-w-70 space-y-5">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-white/3 hover:bg-white/8 border border-white/10 rounded-xl py-3.5 px-4 transition-all duration-300 group shadow-lg"
            >
              <Chrome className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">Continue with Google</span>
            </button>

            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent flex-1"></div>
              <span className="text-neutral-600 text-[10px] font-bold uppercase tracking-widest">Or</span>
              <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent flex-1"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-red-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  required
                  autoComplete="email"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-red-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner"
                />
              </div>

              {error && (
                <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-70 disabled:hover:bg-red-600 text-white font-semibold text-sm py-3.5 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </button>
            </form>
          </div>

          <p className="mt-8 text-xs text-neutral-500">
            Need an account? <Link href="/signup" className="text-red-400 font-medium hover:text-red-300 hover:underline transition-all">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
