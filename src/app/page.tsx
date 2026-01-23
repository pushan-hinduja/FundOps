import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center max-w-2xl">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-6 h-6 text-primary-foreground"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-3xl font-medium tracking-tight">FundOps</span>
        </div>

        <h1 className="metric-number text-5xl md:text-6xl tracking-tight mb-4">
          LP CRM & Deal Signals
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
          Transform LP email communication into structured relationship intelligence and manage your fundraising pipeline.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
