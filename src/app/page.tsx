import Link from "next/link";
import { GridPage } from "@/components/shared/GridBackground";

export default function Home() {
  return (
    <GridPage>
      <div className="text-center px-4 sm:px-8 w-full">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 mb-6">
          <svg viewBox="130 95 140 150" className="w-12 h-12" xmlns="http://www.w3.org/2000/svg">
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
          <span className="text-3xl font-medium tracking-tight">FundOps</span>
        </div>

        <h1
          className="metric-number text-4xl md:text-5xl tracking-tight mb-4 pb-2 bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(135deg, hsl(240 10% 4%), hsl(217 91% 60%))" }}
        >
          Relationship Intelligence
        </h1>
        <p className="text-lg text-neutral-500 mb-10 max-w-lg mx-auto">
          AI to automate your deal flow and help manage your fundraising pipeline.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link
            href="/login"
            className="px-8 py-3.5 bg-black text-white rounded-xl font-medium hover:opacity-90 transition-opacity w-full sm:w-auto text-center"
          >
            Sign In
          </Link>
          <Link
            href="/login?mode=signup"
            className="px-8 py-3.5 bg-neutral-100 text-black rounded-xl font-medium hover:bg-neutral-200 transition-colors w-full sm:w-auto text-center"
          >
            Get Started
          </Link>
        </div>
      </div>
    </GridPage>
  );
}
