import type { Metadata } from "next";
import { Combo, Plus_Jakarta_Sans } from "next/font/google";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import "./globals.css";

/* Headings now use Google's "Combo" — a single-weight display serif
   that gives the wordmark-like feel the brief asked for. Combo ships
   in only one weight (400), so we only request that one; any
   `font-weight: 500/600/700` on headings will fall back to 400 for
   this face (browser doesn't synthesise bold). */
const combo = Combo({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rena Bianca",
  description: "Modern Mediterranean dining experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${combo.variable} ${jakarta.variable}`}>
      <body suppressHydrationWarning>
        <I18nProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
