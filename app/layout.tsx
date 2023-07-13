import Head from "next/head";
import Link from "next/link";
import { Suspense } from "react";
import "styles/globals.css";
import "styles/style.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <Head>
        <title>blog</title>
        <meta name="description" content="blog description" />
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <body className="space-y-4">
        <header>
        <h1><Link href="/" className="no-underline">blog(unstable)</Link></h1>
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
