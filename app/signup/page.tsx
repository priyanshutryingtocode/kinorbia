"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Mail, Lock, Chrome, ArrowLeft, User } from "lucide-react";
import { signIn } from "next-auth/react"; // Import Google Sign-in

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const form = e.target as HTMLFormElement;
        form.reset();
        router.push("/login"); // Redirect to login on success
      } else {
        const data = await res.json();
        setError(data.message);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-red-600/20 rounded-full blur-[140px] pointer-events-none opacity-50 animate-pulse delay-700"></div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-neutral-500 hover:text-white transition group z-50">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to KinOrbia</span>
      </Link>

      {/* === THE 3D ORB CONTAINER === */}
      <div className="relative w-full max-w-137.5 aspect-square flex flex-col justify-center items-center">
        
        {/* Layer 1: Deep Shadow */}
        <div className="absolute inset-4 rounded-full bg-black shadow-[0_0_140px_rgba(220,38,38,0.4)]"></div>

        {/* Layer 2: Main Orb Body */}
        <div className="absolute inset-0 rounded-full border border-white/10 bg-linear-to-br from-white/5 via-red-950/40 to-black backdrop-blur-3xl overflow-hidden shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]">
           <div className="absolute inset-[-50%] bg-linear-to-r from-transparent via-red-900/20 to-transparent rotate-45 animate-[spin_12s_linear_infinite] opacity-50 blur-3xl"></div>
        </div>

        {/* Layer 3: Specular Highlight */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-2/3 h-24 bg-linear-to-b from-white/20 to-transparent rounded-full blur-md opacity-70 pointer-events-none"></div>

        {/* Layer 4: Content */}
        <div className="relative z-10 w-full px-16 py-10 flex flex-col items-center text-center">
          
          <div className="flex items-center gap-2 mb-4">
            <Film className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold tracking-tighter text-white">KinOrbia</h1>
          </div>
          <p className="text-white mb-6 text-sm font-bold uppercase tracking-widest">Join the Orbit</p>

          <button 
            onClick={() => signIn("google", { callbackUrl: "/" })}
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-neutral-900/50 hover:bg-neutral-800 border border-white/10 rounded-xl py-3 px-4 transition-all group backdrop-blur-md"
          >
            <Chrome className="w-5 h-5 text-white" />
            <span className="text-sm font-medium text-neutral-200">Sign up with Google</span>
          </button>

          <div className="flex items-center gap-4 w-full my-4">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-neutral-600 text-[10px] font-bold">OR CREATE ACCOUNT</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs py-2 px-3 rounded-lg w-full mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-3">
            {/* Full Name Input */}
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-red-500 transition-colors z-10" />
              <input 
                onChange={(e) => setName(e.target.value)}
                type="text" 
                placeholder="Full Name" 
                required
                className="w-full bg-neutral-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all" 
              />
            </div>

            {/* Email Input */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-red-500 transition-colors z-10" />
              <input 
                onChange={(e) => setEmail(e.target.value)}
                type="email" 
                placeholder="Email address" 
                required
                className="w-full bg-neutral-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all" 
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-red-500 transition-colors z-10" />
              <input 
                onChange={(e) => setPassword(e.target.value)}
                type="password" 
                placeholder="Create Password" 
                required
                className="w-full bg-neutral-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all" 
              />
            </div>

            <button 
              disabled={pending}
              type="submit" 
              className="w-full mt-6 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all transform hover:scale-[1.02]"
            >
              {pending ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-neutral-500">
            Already have an account? <Link href="/login" className="text-white hover:text-red-400 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}