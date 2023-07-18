import type { NextPage, Metadata} from "next";
import Link from "next/link";
import Card from "modules/article/components/card";
import { getCurrentTagPage } from "modules/pages/functions";

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

const Home: NextPage = (
  { params, searchParams }:
  {
    params: { tag: string },
    searchParams: { page: number }
  }
) => {
  const tag = decodeURIComponent(params.tag);
  const index = 1 < searchParams.page ? searchParams.page - 1 : TOP_PAGE_INDEX;
  const { posts, prev, next } = getCurrentTagPage(tag, index);

  return (
    <>
      <div className="grid grid-cols-1">
        {posts.map((post) => (
          <Card {...post} key={post.url}></Card>
        ))}
      </div>
      <div className="flex flex-row content-center justify-center">
          <div className="basis-1/3 rounded-lg flex items-center justify-center">{prev && <Link href={`/?page=${prev}`}>previous</Link>}</div>
          <div className="basis-1/3 rounded-lg flex items-center justify-center"><Link href="/">◆</Link></div>
          <div className="basis-1/3 rounded-lg flex items-center justify-center">{next && <Link href={`/?page=${next}`}>next</Link>}</div>
      </div>
    </>
  );
};

export default Home;
