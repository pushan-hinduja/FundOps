import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="px-8 py-6 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">Stay updated on important activity</p>
      </div>

      {/* Empty State */}
      <div className="bg-card border border-border rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium mb-2">No notifications yet</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          When you receive notifications about deals, LPs, or other activity, they will appear here.
        </p>
      </div>
    </div>
  );
}
