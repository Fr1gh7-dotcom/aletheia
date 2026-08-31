import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const DESCRIPTION =
  "Quanto costa davvero a un contribuente italiano il sostegno all'Ucraina. Ogni cifra con la sua fonte istituzionale, prestiti e fondo perduto separati, stime distinte dai dati esatti.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aletheia — Tracciamento aiuti Ucraina-UE",
    template: "%s · Aletheia",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "aiuti Ucraina",
    "Ukraine Facility",
    "costo pro-capite",
    "contribuente italiano",
    "trasparenza",
    "bilancio UE",
    "Kiel Ukraine Support Tracker",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Aletheia — Tracciamento aiuti Ucraina-UE",
    description:
      "Chiarezza sui numeri degli aiuti all'Ucraina e sul costo pro-capite per i contribuenti italiani.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aletheia — Tracciamento aiuti Ucraina-UE",
    description:
      "Chiarezza sui numeri degli aiuti all'Ucraina e sul costo pro-capite per i contribuenti italiani.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
