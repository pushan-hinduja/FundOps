import { TopNav } from "@/components/layout/TopNav";
import { AISearchProvider } from "@/components/ai/AISearchContext";
import AISearchWrapper from "@/components/ai/AISearchWrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AISearchProvider>
      <div className="flex flex-col h-screen bg-background">
        <TopNav />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <AISearchWrapper />
      </div>
    </AISearchProvider>
  );
}
