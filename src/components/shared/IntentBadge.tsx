import { cn } from "@/lib/utils/cn";

type Intent = "interested" | "committed" | "declined" | "question" | "neutral" | null;

const intentStyles: Record<NonNullable<Intent>, { bg: string; text: string; label: string }> = {
  interested: { bg: "bg-blue-100", text: "text-blue-800", label: "Interested" },
  committed: { bg: "bg-green-100", text: "text-green-800", label: "Committed" },
  declined: { bg: "bg-red-100", text: "text-red-800", label: "Declined" },
  question: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Question" },
  neutral: { bg: "bg-gray-100", text: "text-gray-800", label: "Neutral" },
};

export function IntentBadge({ intent }: { intent: Intent }) {
  if (!intent) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Pending
      </span>
    );
  }

  const style = intentStyles[intent];
  return (
    <span
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        style.bg,
        style.text
      )}
    >
      {style.label}
    </span>
  );
}
