import type { NextPage, Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Card from "modules/article/components/card";
import { getCurrentCategoryPage } from "modules/pages/functions";

const TOP_PAGE_INDEX = 0;
const SITE_DOMAIN = process.env.SITE_DOMAIN
  ? process.env.SITE_DOMAIN
  : "blog.k16em.net";

export const metadata: Metadata = {
  title: SITE_DOMAIN,
  description: "k16emのブログ",
  openGraph: {
    title: SITE_DOMAIN,
    description: "k16emのブログ",
  },
};

const Home: NextPage = ({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams: { page: number };
}) => {
  const category = decodeURIComponent(params.category);

  // FIXME: こんなケースはなさそうな気がする
  if (!category) {
    redirect("/categories");
  }

  const index = 1 < searchParams.page ? searchParams.page - 1 : TOP_PAGE_INDEX;
  const { posts, prev, next } = getCurrentCategoryPage(category, index);

  return (
    <>
      <div className="grid grid-cols-1">
        {posts.map((post) => (
          <Card {...post} key={post.url}></Card>
        ))}
      </div>
      <div className="flex flex-row content-center justify-center">
        <div className="basis-1/3 rounded-lg flex items-center justify-center">
          {prev && (
            <Link
              href={`/categories/${encodeURIComponent(category)}?page=${prev}`}
            >
              previous
            </Link>
          )}
        </div>
        <div className="basis-1/3 rounded-lg flex items-center justify-center">
          <Link href="/">◆</Link>
        </div>
        <div className="basis-1/3 rounded-lg flex items-center justify-center">
          {next && (
            <Link
              href={`/categories/${encodeURIComponent(category)}?page=${next}`}
            >
              next
            </Link>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
