import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Lao } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansLao = Noto_Sans_Lao({
  variable: "--font-noto-sans-lao",
  subsets: ["latin", "lao"],
});

export const metadata: Metadata = {
  title: {
    default: "Talad Kai Ti | ຕະຫຼາດໄກ່ຕີ",
    template: "%s | Talad Kai Ti",
  },
  description: "Marketplace for poultry and related lawful goods in Laos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="lo"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansLao.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
