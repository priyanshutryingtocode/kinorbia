"use client";

import Link from "next/link";
import { Film, Mail, Lock, Chrome } from "lucide-react";
import { signIn } from "next-auth/react"; // Import the Auth hook

export default function LoginPage() {
  return (
    // Main Background Container with subtle atmospheric light
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glowing blob to enhance depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-red-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      {/* === THE 3D ORB CONTAINER === */}
      <div className="relative w-full max-w-125 aspect-square">
        
        {/* Layer 1: The Outer Glow & Shape definition */}
        <div className="absolute inset-0 rounded-full shadow-[0_0_100px_-20px_rgba(220,38,38,0.3)] bg-neutral-950"></div>
        
        {/* Layer 2: The Spinning Plasma Texture (Defined in globals.css) */}
        <div className="absolute inset-1 rounded-full orb-plasma overflow-hidden opacity-80"></div>

        {/* Layer 3: The Inner Rim Light (Creates the 3D sphere look) */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_15px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.1)] border border-white/5"></div>
        
        {/* Layer 4: The Content inside the Orb */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 z-10 text-center backdrop-blur-sm rounded-full">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group mb-8">
            <Film className="w-8 h-8 text-red-500" />
            <span className="text-3xl font-bold tracking-tighter text-white">
              Kin<span className="text-red-500">Orbia</span>
            </span>
          </Link>

          <h2 className="text-xl font-medium text-neutral-200 mb-6">Enter the Sphere</h2>

          {/* Login Form Stack */}
          <div className="w-full max-w-xs space-y-4">
            
            {/* Google Login Button (With Logic Added) */}
            <button 
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg py-3 px-4 transition-all group"
            >
              <Chrome className="w-5 h-5 text-neutral-300 group-hover:text-red-400 transition" />
              <span className="text-sm font-medium">Continue with Google</span>
            </button>

            <div className="flex items-center gap-4 my-4">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-neutral-500 text-xs uppercase">Or</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>
            
            {/* Email Input */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input type="email" placeholder="Email address" className="glass-input pl-12" />
            </div>

             {/* Password Input */}
             <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input type="password" placeholder="Password" className="glass-input pl-12" />
            </div>

            {/* Sign In Button */}
            <button className="w-full bg-linear-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-red-900/30 transition-all relative overflow-hidden group">
               <span className="relative z-10">Sign In</span>
               {/* Subtle shine effect on hover */}
               <div className="absolute inset-0 h-full w-full scale-0 rounded-lg group-hover:scale-150 group-hover:bg-white/10 transition-all duration-700 ease-out pointer-events-none"></div>
            </button>

          </div>

          <p className="mt-8 text-sm text-neutral-400">
            Need an account? <Link href="/signup" className="text-red-400 hover:text-red-300 hover:underline transition">Sign up</Link>
          </p>

        </div>
      </div>
    </div>
  );
}