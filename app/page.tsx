import type { NextPage, Metadata} from "next";
import Link from "next/link";
import Card from "modules/article/components/card";
import { getCurrentPage } from "modules/pages/functions";

const TOP_PAGE_INDEX = 0;
const SITE_DOMAIN = process.env.SITE_DOMAIN ? process.env.SITE_DOMAIN : "blog.k16em.net";

export const metadata: Metadata = {
  title: SITE_DOMAIN,
  description: 'k16emのブログ',
  openGraph: {
    title: SITE_DOMAIN,
    description: 'k16emのブログ',
  }
}

const Home: NextPage = () => {
  const { posts, prev, next } = getCurrentPage(TOP_PAGE_INDEX);

  return (
    <>
      <div className="grid grid-cols-1">
        {posts.map((post) => (
          <Card {...post} key={post.url}></Card>
        ))}
      </div>
      <div className="flex flex-row content-center justify-center">
          <div className="basis-1/3 rounded-lg flex items-center justify-center">{prev && <Link href={`/${prev}`}>previous</Link>}</div>
          <div className="basis-1/3 rounded-lg flex items-center justify-center"><p>◆</p></div>
          <div className="basis-1/3 rounded-lg flex items-center justify-center">{next && <Link href={`/${next}`}>next</Link>}</div>
      </div>
    </>
  );
};

export default Home;
