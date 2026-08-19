import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Икорный: Сборка",
  description: "Order management dashboard for ecommerce teams"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
