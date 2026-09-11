import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { LOCALE_BCP47, dirFor } from "@/lib/i18n/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vacation Budget",
  description: "Plan and track your vacation budget across cities and currencies.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vacation Budget",
  },
  formatDetection: {
    telephone: false,
  },
};

// viewport-fit=cover + the safe-area-inset-* CSS in globals.css are what let the
// bottom nav and headers extend correctly under the iPhone notch / home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    // Keep in sync with --background in app/globals.css.
    { media: "(prefers-color-scheme: light)", color: "#efe2d0" },
    { media: "(prefers-color-scheme: dark)", color: "#1a140f" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <html
      lang={LOCALE_BCP47[locale]}
      dir={dirFor(locale)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <LocaleProvider locale={locale} dict={dict}>
          <OfflineBanner />
          <InstallPrompt />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
