"use client";

import Link from "next/link";
import { Film, Mail, Lock, Chrome } from "lucide-react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glowing blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-red-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      {/* === THE 3D ORB CONTAINER === */}
      <div className="relative w-full max-w-125 aspect-square">
        
        {/* Layer 1: Outer Glow */}
        <div className="absolute inset-0 rounded-full shadow-[0_0_100px_-20px_rgba(220,38,38,0.3)] bg-neutral-950"></div>
        
        {/* Layer 2: Plasma Texture */}
        <div className="absolute inset-1 rounded-full orb-plasma overflow-hidden opacity-80"></div>

        {/* Layer 3: Inner Rim Light */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_15px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.1)] border border-white/5"></div>
        
        {/* Layer 4: Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 z-10 text-center backdrop-blur-sm rounded-full">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group mb-6 hover:scale-105 transition-transform">
            <Film className="w-8 h-8 text-red-500" />
            <span className="text-3xl font-bold tracking-tighter text-white">
              Kin<span className="text-red-500">Orbia</span>
            </span>
          </Link>

          <h2 className="text-lg font-medium text-neutral-300 tracking-wide mb-8">Enter the Sphere</h2>

          {/* Login Form Stack */}
          <div className="w-full max-w-70 space-y-5">
            
            {/* Google Login Button */}
            <button 
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-white/3 hover:bg-white/8 border border-white/10 rounded-xl py-3.5 px-4 transition-all duration-300 group shadow-lg"
            >
              <Chrome className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent flex-1"></div>
              <span className="text-neutral-600 text-[10px] font-bold uppercase tracking-widest">Or</span>
              <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent flex-1"></div>
            </div>
            
            {/* Email Input */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-red-400 transition-colors" />
              <input 
                type="email" 
                placeholder="Email address" 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner" 
              />
            </div>

             {/* Password Input */}
             <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-red-400 transition-colors" />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner" 
              />
            </div>

            {/* Sign In Button */}
            <button className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold text-sm py-3.5 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:-translate-y-0.5 transition-all duration-300">
               Sign In
            </button>

          </div>

          <p className="mt-8 text-xs text-neutral-500">
            Need an account? <Link href="/signup" className="text-red-400 font-medium hover:text-red-300 hover:underline transition-all">Sign up</Link>
          </p>

        </div>
      </div>
    </div>
  );
}