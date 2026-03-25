"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GridPage } from "@/components/shared/GridBackground";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [step, setStep] = useState(1);
  const [signupComplete, setSignupComplete] = useState(false);
  const [barStyle, setBarStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Position progress bar 10px from bottom of the content area
  useEffect(() => {
    if (mode !== "signup") return;
    function calc() {
      const contentArea = wrapperRef.current?.closest(".z-10") as HTMLElement | null;
      if (!contentArea) return;
      const rect = contentArea.getBoundingClientRect();
      setBarStyle({
        position: "fixed",
        left: rect.left + 40,
        right: window.innerWidth - rect.right + 40,
        top: rect.bottom - 20,
      });
    }
    // Defer to ensure the content area is laid out after client-side navigation
    const raf = requestAnimationFrame(() => {
      // Double-raf to ensure layout is complete
      requestAnimationFrame(calc);
    });
    window.addEventListener("resize", calc);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", calc);
    };
  }, [mode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email address first, then click forgot password.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: name,
            org_name: orgName.trim() || undefined,
          },
        },
      });
      if (signUpError) throw signUpError;

      setSignupComplete(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep(2);
  };

  const handleBackStep = () => {
    setError(null);
    setStep(1);
  };

  const switchToSignUp = () => {
    setMode("signup");
    setStep(1);
    setError(null);
  };

  const switchToSignIn = () => {
    setMode("signin");
    setStep(1);
    setError(null);
  };

  const logo = (
    <div className="text-center mb-6">
      <Link href="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
        <svg viewBox="130 95 140 150" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
          <line x1="200" y1="170" x2="200" y2="85" stroke="#111111" strokeWidth="4.5" opacity="0.85" transform="rotate(0, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="90" stroke="#111111" strokeWidth="4.5" opacity="0.76" transform="rotate(45, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="88" stroke="#111111" strokeWidth="4.5" opacity="0.8" transform="rotate(90, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="92" stroke="#111111" strokeWidth="4.5" opacity="0.72" transform="rotate(150, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="86" stroke="#111111" strokeWidth="4.5" opacity="0.85" transform="rotate(200, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="90" stroke="#111111" strokeWidth="4.5" opacity="0.76" transform="rotate(270, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="88" stroke="#111111" strokeWidth="4.5" opacity="0.78" transform="rotate(315, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="108" stroke="#111111" strokeWidth="3.25" opacity="0.62" transform="rotate(20, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="112" stroke="#111111" strokeWidth="3.25" opacity="0.56" transform="rotate(65, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="105" stroke="#111111" strokeWidth="3.25" opacity="0.66" transform="rotate(110, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="115" stroke="#111111" strokeWidth="3.25" opacity="0.52" transform="rotate(130, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="110" stroke="#111111" strokeWidth="3.25" opacity="0.58" transform="rotate(175, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="108" stroke="#111111" strokeWidth="3.25" opacity="0.62" transform="rotate(225, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="112" stroke="#111111" strokeWidth="3.25" opacity="0.54" transform="rotate(250, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="106" stroke="#111111" strokeWidth="3.25" opacity="0.64" transform="rotate(295, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="110" stroke="#111111" strokeWidth="3.25" opacity="0.56" transform="rotate(340, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="128" stroke="#111111" strokeWidth="2.25" opacity="0.46" transform="rotate(10, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="132" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(35, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="130" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(55, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="126" stroke="#111111" strokeWidth="2.25" opacity="0.48" transform="rotate(78, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="134" stroke="#111111" strokeWidth="2.25" opacity="0.38" transform="rotate(100, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="128" stroke="#111111" strokeWidth="2.25" opacity="0.44" transform="rotate(120, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="132" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(142, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="130" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(162, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="126" stroke="#111111" strokeWidth="2.25" opacity="0.46" transform="rotate(188, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="134" stroke="#111111" strokeWidth="2.25" opacity="0.38" transform="rotate(212, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="128" stroke="#111111" strokeWidth="2.25" opacity="0.44" transform="rotate(238, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="130" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(258, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="132" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(282, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="126" stroke="#111111" strokeWidth="2.25" opacity="0.46" transform="rotate(305, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="134" stroke="#111111" strokeWidth="2.25" opacity="0.38" transform="rotate(328, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="130" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(350, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="88" stroke="#1E3A5F" strokeWidth="5.5" opacity="0.95" transform="rotate(30, 200, 170)"/>
          <line x1="200" y1="170" x2="200" y2="92" stroke="#1E3A5F" strokeWidth="5.5" opacity="0.85" transform="rotate(240, 200, 170)"/>
          <circle cx="200" cy="170" r="13" fill="#111111"/>
          <circle cx="200" cy="170" r="5.25" fill="#FFFFFF"/>
        </svg>
        <span className="text-2xl font-medium tracking-tight">FundOps</span>
      </Link>
    </div>
  );

  const inputClass = "w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all text-sm";

  // Sign In form
  if (mode === "signin") {
    if (resetSent) {
      return (
        <div className="w-full max-w-sm mx-auto">
          {logo}
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium">Check your email</h2>
            <p className="text-sm text-neutral-500">
              We sent a password reset link to <span className="font-medium text-black">{email}</span>. Click the link to reset your password.
            </p>
            <button
              onClick={() => setResetSent(false)}
              className="mt-4 w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-sm mx-auto">
        {logo}

        <form onSubmit={handleSignIn} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
              placeholder="••••••••"
            />
            <div className="text-right mt-1.5">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Sign In"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          <p className="text-neutral-500">
            Don&apos;t have an account?{" "}
            <button onClick={switchToSignUp} className="text-black font-medium hover:text-neutral-600 transition-colors">
              Sign up
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Sign Up flow
  if (signupComplete) {
    return (
      <div className="w-full max-w-sm mx-auto">
        {logo}
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium">Check your email</h2>
          <p className="text-sm text-neutral-500">
            We sent a confirmation link to <span className="font-medium text-black">{email}</span>. Click the link to activate your account.
          </p>
          <button
            onClick={switchToSignIn}
            className="mt-4 w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="w-full max-w-sm mx-auto">
      {logo}

      {step === 1 ? (
        <form onSubmit={handleNextStep} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium mb-1.5">Email</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium mb-1.5">Password</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Next
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="org-name" className="block text-sm font-medium mb-1.5">
              Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className={inputClass}
              placeholder="My VC Firm"
            />
            <p className="text-xs text-neutral-400 mt-1.5">
              Optional — you can set this up later in settings.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBackStep}
              className="flex-1 py-2.5 px-4 border border-neutral-200 text-black rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 text-center text-sm">
        <p className="text-neutral-500">
          Already have an account?{" "}
          <button onClick={switchToSignIn} className="text-black font-medium hover:text-neutral-600 transition-colors">
            Sign in
          </button>
        </p>
      </div>

      {/* Progress bar - pinned to bottom of content area */}
      {barStyle.position && (
        <div className="flex gap-2 z-20" style={barStyle}>
          <div className="h-1 flex-1 rounded-full bg-black" />
          <div className={`h-1 flex-1 rounded-full ${step === 2 ? "bg-black" : "bg-neutral-200"}`} />
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <GridPage>
      <Suspense fallback={<div className="text-center text-neutral-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </GridPage>
  );
}
