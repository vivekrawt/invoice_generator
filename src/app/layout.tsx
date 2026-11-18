import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABIRA Enterprises | Local Invoice Generator",
  description:
    "Local invoice management for ABIRA Enterprises.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-[#0b1f3a] selection:text-white">
        {children}
      </body>
    </html>
  );
}
