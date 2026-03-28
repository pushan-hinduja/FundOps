"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GridPage } from "@/components/shared/GridBackground";

function AcceptInviteForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [step, setStep] = useState(0); // 0 = loading, 1 = name/password, 2 = org confirmation
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitError, setIsInitError] = useState(false);
  const [barStyle, setBarStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Parse tokens from URL fragment and establish session
  useEffect(() => {
    async function init() {
      const hash = window.location.hash.substring(1);
      if (!hash) {
        setError("Invalid invite link. Please ask your admin to resend the invite.");
        setIsInitError(true);
        setStep(1);
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setError("Invalid invite link. Please ask your admin to resend the invite.");
        setIsInitError(true);
        setStep(1);
        return;
      }

      // Set session from the invite tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError("This invite link has expired. Please ask your admin to resend the invite.");
        setIsInitError(true);
        setStep(1);
        return;
      }

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Could not verify your identity. Please ask your admin to resend the invite.");
        setIsInitError(true);
        setStep(1);
        return;
      }

      setEmail(user.email || "");
      setOrgName(user.user_metadata?.invited_org_name || "");

      // Clear the hash from the URL for cleanliness (without triggering navigation)
      window.history.replaceState(null, "", window.location.pathname);

      setStep(1);
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Position progress bar at bottom of content area (matching signup flow)
  useEffect(() => {
    if (step === 0) return;
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
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(calc);
    });
    window.addEventListener("resize", calc);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", calc);
    };
  }, [step]);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setStep(2);
  };

  const handleBackStep = () => {
    setError(null);
    setStep(1);
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Update password and name on the auth user
      const updateData: { password: string; data?: { full_name: string } } = { password };
      if (name.trim()) {
        updateData.data = { full_name: name.trim() };
      }
      const { error: updateError } = await supabase.auth.updateUser(updateData);
      if (updateError) throw updateError;

      // Update name in our users table via profile API
      if (name.trim()) {
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
      }

      // Process the invite server-side (create user row, join org, mark invite accepted)
      const res = await fetch("/api/organization/accept-invite", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process invite");

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all text-sm";

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

  // Loading state while parsing tokens
  if (step === 0) {
    return (
      <div className="w-full max-w-sm mx-auto">
        {logo}
        <div className="text-center text-neutral-400 text-sm">Setting up your invite...</div>
      </div>
    );
  }

  // Show only the error message when the link is invalid/expired
  if (isInitError) {
    return (
      <div className="w-full max-w-sm mx-auto">
        {logo}
        <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600">
          {error}
        </div>
        <Link
          href="/login"
          className="block mt-4 w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity text-center"
        >
          Back to Sign In
        </Link>
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
            <label htmlFor="invite-email" className="block text-sm font-medium mb-1.5">Email</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              disabled
              className={`${inputClass} bg-neutral-50 text-neutral-500 cursor-not-allowed`}
            />
          </div>

          <div>
            <label htmlFor="invite-password" className="block text-sm font-medium mb-1.5">Password</label>
            <input
              id="invite-password"
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
            disabled={!email}
            className="w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Next
          </button>
        </form>
      ) : (
        <form onSubmit={handleComplete} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="org-name" className="block text-sm font-medium mb-1.5">
              Organization
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              disabled
              className={`${inputClass} bg-neutral-50 text-neutral-500 cursor-not-allowed`}
            />
            <p className="text-xs text-neutral-400 mt-1.5">
              You&apos;re accepting an invite to join this organization.
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

export default function AcceptInvitePage() {
  return (
    <GridPage>
      <AcceptInviteForm />
    </GridPage>
  );
}
