"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";

type ResponseTone = "professional" | "friendly" | "formal" | "concise";

interface ToneOption {
  value: ResponseTone;
  label: string;
  description: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    value: "professional",
    label: "Professional",
    description: "Clear, respectful, and thorough with a warm but business-appropriate style",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm and approachable while maintaining professionalism",
  },
  {
    value: "formal",
    label: "Formal",
    description: "Traditional business tone with proper salutations and precise language",
  },
  {
    value: "concise",
    label: "Concise",
    description: "Brief and direct responses that get to the point quickly",
  },
];

export function AIResponseSettings() {
  const [selectedTone, setSelectedTone] = useState<ResponseTone>("professional");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.ai_response_tone) {
            setSelectedTone(data.settings.ai_response_tone);
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToneChange = async (tone: ResponseTone) => {
    setSelectedTone(tone);
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { ai_response_tone: tone },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError("Failed to save. Please try again.");
      // Revert selection on error
      const fetchSettings = async () => {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.ai_response_tone) {
            setSelectedTone(data.settings.ai_response_tone);
          }
        }
      };
      fetchSettings();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium">AI Response Settings</h2>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-medium">AI Response Settings</h2>
          <p className="text-sm text-muted-foreground">
            Customize how AI-generated email responses are written
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-3">Response Tone</h3>
          <div className="space-y-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToneChange(option.value)}
                disabled={isSaving}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selectedTone === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30 hover:bg-secondary/30"
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                  {selectedTone === option.value && (
                    <div className="flex-shrink-0 ml-3">
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status messages */}
        {saveSuccess && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Settings saved successfully!
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
