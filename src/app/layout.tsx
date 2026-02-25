import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peminjaman Alat SGD",
  description: "Portal Peminjaman Alat Inventaris SGD",
  manifest: "/manifest.json",
  icons: {
    icon: "https://ik.imagekit.io/Sgd/sgd.png?updatedAt=1771273258582",
    apple: "https://ik.imagekit.io/Sgd/sgd.png?updatedAt=1771273258582",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SGD Inventaris",
  },
};

export const viewport: Viewport = {
  themeColor: "#C5A02D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import SessionWrapper from "@/components/SessionWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <SessionWrapper>
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}

