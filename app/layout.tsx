import type { Metadata, Viewport } from "next";
import { BUSINESS } from "@/config/business";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.siteUrl),
  title: {
    default: "ФасадоФ - мебельные фасады и столешницы на заказ",
    template: "%s - ФасадоФ",
  },
  description:
    "Производство мебельных фасадов, столешниц и индивидуальных мебельных решений: эмаль, шпон, массив, ПЭТ, Fenix, камень, ART Beton.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ФасадоФ - premium showroom фасадов и столешниц",
    description: "Мебельные фасады и столешницы на заказ. Бесплатная доставка. ПН–ПТ 09:00–18:00.",
    url: "/",
    siteName: "ФасадоФ",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1792,
        height: 1024,
        alt: "Материальная композиция ФасадоФ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ФасадоФ - мебельные фасады и столешницы",
    description: "Premium showroom: фасады, столешницы, материалы и расчет проекта.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS.name,
    url: BUSINESS.siteUrl,
  };

  return (
    <html lang="ru">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </body>
    </html>
  );
}
