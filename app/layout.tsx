import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Anvesync EMP | Employee Management Platform",
    template: "%s | Anvesync EMP",
  },
  description: "Internal Employee Management Platform for Anvesync Innovation & Entrepreneurial Forum",
  keywords: ["employee management", "HR", "attendance", "leave management"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
