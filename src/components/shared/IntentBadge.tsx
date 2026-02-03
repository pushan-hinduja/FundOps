import { cn } from "@/lib/utils/cn";

type Intent = "interested" | "committed" | "declined" | "question" | "neutral" | null;

const intentStyles: Record<NonNullable<Intent>, { text: string; label: string }> = {
  interested: { text: "text-blue-600", label: "Interested" },
  committed: { text: "text-green-600", label: "Committed" },
  declined: { text: "text-red-600", label: "Declined" },
  question: { text: "text-yellow-600", label: "Question" },
  neutral: { text: "text-muted-foreground", label: "Neutral" },
};

export function IntentBadge({ intent }: { intent: Intent }) {
  if (!intent) {
    return (
      <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground">
        Pending
      </span>
    );
  }

  const style = intentStyles[intent];
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-lg text-xs font-medium bg-secondary",
        style.text
      )}
    >
      {style.label}
    </span>
  );
}
