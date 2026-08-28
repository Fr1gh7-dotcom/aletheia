import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Aletheia — Tracciamento aiuti Ucraina-UE",
    template: "%s · Aletheia",
  },
  description:
    "Quanto costa davvero a un contribuente italiano il sostegno all'Ucraina. Ogni cifra con la sua fonte istituzionale, prestiti e fondo perduto separati, stime distinte dai dati esatti.",
  metadataBase: new URL("https://aletheia.example"),
  openGraph: {
    title: "Aletheia — Tracciamento aiuti Ucraina-UE",
    description:
      "Chiarezza sui numeri degli aiuti all'Ucraina e sul costo pro-capite per i contribuenti italiani.",
    type: "website",
  },
  robots: { index: true, follow: true },
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
