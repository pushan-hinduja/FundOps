import { TopNav } from "@/components/layout/TopNav";
import { AISearchProvider } from "@/components/ai/AISearchContext";
import AISearchWrapper from "@/components/ai/AISearchWrapper";
import { SyncProvider } from "@/components/shared/SyncContext";
import { SyncToast } from "@/components/shared/SyncToast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AISearchProvider>
      <SyncProvider>
        <div className="flex flex-col h-screen bg-background">
          <TopNav />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <AISearchWrapper />
          <SyncToast />
        </div>
      </SyncProvider>
    </AISearchProvider>
  );
}
