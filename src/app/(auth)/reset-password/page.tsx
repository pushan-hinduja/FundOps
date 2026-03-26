"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { GridPage } from "@/components/shared/GridBackground";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const isInvite = searchParams.get("invite") === "true";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const inputClass =
    "w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all text-sm";

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // Update password
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;

      // If invite mode, also update name if provided
      if (isInvite && name.trim()) {
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  const logo = (
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-3">
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
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto">
        {logo}
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <svg
              className="w-7 h-7 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-medium">
            {isInvite ? "Account setup complete" : "Password updated"}
          </h2>
          <p className="text-sm text-neutral-500">
            {isInvite
              ? "Your account is ready. Let's get started."
              : "Your password has been reset successfully. You can now sign in with your new password."}
          </p>
          {isInvite ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </button>
          ) : (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="mt-4 w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {logo}

      {isInvite && (
        <div className="text-center mb-6">
          <h2 className="text-xl font-medium">Welcome to FundOps</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Set up your account to get started.
          </p>
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600">
            {error}
          </div>
        )}

        {isInvite && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="John Doe"
            />
          </div>
        )}

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium mb-1.5">
            {isInvite ? "Password" : "New Password"}
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading
            ? isInvite ? "Setting up..." : "Resetting..."
            : isInvite ? "Complete Setup" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <GridPage>
      <Suspense fallback={<div className="text-center text-neutral-400">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </GridPage>
  );
}
