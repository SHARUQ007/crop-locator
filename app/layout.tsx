import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CropLocator — A better place to grow",
  description:
    "A map-first workspace for confident crop, land and sourcing decisions. An interactive SBSF Agritech prototype with illustrative data.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
