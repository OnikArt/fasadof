import type { Metadata, Viewport } from "next";
import { Chat2DeskWidget } from "@/components/Chat2DeskWidget";
import { BUSINESS } from "@/config/business";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BUSINESS.siteUrl),
  title: {
    default: "ФасадоФ — мебельные фасады и столешницы на заказ в Воронеже",
    template: "%s — ФасадоФ",
  },
  description:
    "Мебельные фасады и столешницы на заказ в Воронеже: эмаль, шпон, массив, ПЭТ, Fenix, ПВХ и камень. Подбор материала и расчёт проекта.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ФасадоФ — фасады и столешницы на заказ в Воронеже",
    description: `Мебельные фасады и столешницы на заказ. ${BUSINESS.delivery.label}. ${BUSINESS.workingHours.label}.`,
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
    title: "ФасадоФ — мебельные фасады и столешницы",
    description: "Фасады, столешницы, подбор материалов и расчёт проекта в Воронеже.",
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
    "@type": "LocalBusiness",
    name: BUSINESS.name,
    url: BUSINESS.siteUrl,
    telephone: BUSINESS.phone.e164,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Машиностроителей, д. 3",
      addressLocality: "Воронеж",
      addressCountry: "RU",
    },
    openingHours: "Mo-Fr 09:00-17:00",
    sameAs: [BUSINESS.socials.vk, BUSINESS.socials.max],
  };

  return (
    <html lang="ru">
      <head>
        <link rel="preload" href="/fonts/sofia-sans-variable.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Chat2DeskWidget />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </body>
    </html>
  );
}
