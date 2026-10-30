import type { Metadata } from "next";
// import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  referrer: "no-referrer",
  title: "МОЙ МАГАЗИН",
  description: "Order management dashboard for ecommerce teams"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
        {/* Техподдержка временно отключена.
        <Script id="bitrix24-online-assistant" strategy="afterInteractive">
          {`(function(w,d,u){
            var s=d.createElement('script');s.async=true;s.src=u+'?'+(Date.now()/60000|0);
            var h=d.getElementsByTagName('script')[0];h.parentNode.insertBefore(s,h);
          })(window,document,'https://cdn-ru.bitrix24.ru/b24314144/crm/site_button/loader_6_paxpb9.js');`}
        </Script>
        */}
      </body>
    </html>
  );
}
