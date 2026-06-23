import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoomBooth.studio - Virtual Photobooth",
  description: "Bikin Momen Seru Virtual Photobooth Instan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* 🌟 KUNCI: Gunakan font-sans bawaan Tailwind/System langsung di body */}
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}