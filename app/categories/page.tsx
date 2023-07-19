import type { NextPage, Metadata} from "next";
import Link from "next/link";
import { getCategories } from "modules/pages/functions";

const SITE_DOMAIN = process.env.SITE_DOMAIN ? process.env.SITE_DOMAIN : "blog.k16em.net";

export const metadata: Metadata = {
  title: SITE_DOMAIN,
  description: 'タグ - k16emのブログ',
  openGraph: {
    title: SITE_DOMAIN,
    description: 'タグ - k16emのブログ',
  }
}

const Home: NextPage = () => {
  const categories: string[] = getCategories();

  return (
    <>
      <ul>
        {categories.map((category) => (
          <li>
            <Link href={`/categories/${encodeURIComponent(category)}`}>{category}</Link>
          </li>
        ))}
      </ul>
    </>
  );
};

export default Home;
