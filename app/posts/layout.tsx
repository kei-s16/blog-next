import { Zen_Kurenaido } from 'next/font/google'
import { Suspense } from "react";
import "styles/globals.css";
import "styles/style.css";
 
const zenKurenaido = Zen_Kurenaido({
  subsets: ['latin'],
  weight: '400',
  style: 'normal',
})

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={zenKurenaido.className}>
      <Suspense fallback={null}>{children}</Suspense>
    </html>
  );
}
