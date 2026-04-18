import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://novarix.agency"),
  title: {
    default: "Novarix Digital Agency | Tecnología que transforma negocios",
    template: "%s | Novarix Digital Agency",
  },
  description:
    "Agencia digital integral en Argentina: desarrollo de software, marketing digital, consultoría IT y automatización con IA.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Novarix Digital Agency",
    title: "Novarix Digital Agency",
    description:
      "Desarrollo, marketing, consultoría IT e IA en una sola agencia argentina.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Novarix Digital Agency",
    description:
      "Desarrollo, marketing, consultoría IT e IA en una sola agencia argentina.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen font-sans">
        <Navbar />
        <main className="pt-[72px]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
