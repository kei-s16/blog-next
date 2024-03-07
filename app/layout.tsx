import { Zen_Kurenaido } from 'next/font/google'
import Head from "next/head";
import Link from "next/link";
import { Suspense } from "react";
import "styles/globals.css";
import "styles/style.css";
 
const zenKurenaido = Zen_Kurenaido({
  subsets: ['latin'],
  weight: '400',
  style: 'normal',
})

const SITE_NAME = process.env.SITE_NAME ? process.env.SITE_NAME : "blog.k16em.net";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={zenKurenaido.className}>
      <Head>
        <title>{SITE_NAME}</title>
        <meta name="description" content="blog description" />
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <script data-goatcounter="https://k16em.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
      </Head>
      <body className="space-y-4">
        <header>
        <h1><Link href="/" className="no-underline">{SITE_NAME}</Link></h1>
        </header>
        <Suspense fallback={null}>{children}</Suspense>
        <footer>
          <hr />
          <div className="flex flex-row justify-center">powered by next.js</div>
        </footer>
      </body>
    </html>
  );
}
