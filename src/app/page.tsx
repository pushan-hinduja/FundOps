import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">FundOps</h1>
        <p className="text-muted-foreground mb-8">
          LP CRM & Deal Signal Management Platform
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
