import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecom Orders",
  description: "Order management dashboard for ecommerce teams"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
