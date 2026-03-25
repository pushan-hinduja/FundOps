"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GridPage } from "@/components/shared/GridBackground";

function ResetPasswordForm() {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const logo = (
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 text-primary-foreground"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              d="M20 6L9 17L4 12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
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
          <h2 className="text-xl font-medium">Password updated</h2>
          <p className="text-sm text-neutral-500">
            Your password has been reset successfully. You can now sign in with
            your new password.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="mt-4 w-full py-2.5 px-4 bg-black text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {logo}

      <form onSubmit={handleReset} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium mb-1.5">
            New Password
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
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <GridPage>
      <ResetPasswordForm />
    </GridPage>
  );
}
