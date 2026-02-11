import type { Metadata } from "next";
import { Hedvig_Letters_Sans } from "next/font/google";
import "./globals.css";

const hedvig = Hedvig_Letters_Sans({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FundOps - LP CRM & Deal Signal Management",
  description: "Transform LP email communication into structured relationship intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={hedvig.className}>{children}</body>
    </html>
  );
}
