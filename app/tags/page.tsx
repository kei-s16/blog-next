import type { NextPage, Metadata } from "next";
import Link from "next/link";
import { getTags } from "modules/pages/functions";

const SITE_DOMAIN = process.env.SITE_DOMAIN
  ? process.env.SITE_DOMAIN
  : "blog.k16em.net";

export const metadata: Metadata = {
  title: SITE_DOMAIN,
  description: "タグ - k16emのブログ",
  openGraph: {
    title: SITE_DOMAIN,
    description: "タグ - k16emのブログ",
  },
};

const Home: NextPage = () => {
  const tags: string[] = getTags();

  return (
    <>
      <ul>
        {tags.map((tag) => (
          <li key={tag}>
            <Link href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
          </li>
        ))}
      </ul>
    </>
  );
};

export default Home;
