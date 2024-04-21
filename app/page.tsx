import type { NextPage, Metadata } from "next";
import Card from "modules/article/components/card";
import Footer from "modules/article/components/footer";
import { getCurrentPage } from "modules/pages/functions";

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
  searchParams,
}: {
  searchParams: { page: number };
}) => {
  const index = 1 < searchParams.page ? searchParams.page - 1 : TOP_PAGE_INDEX;
  const { posts, prev, next } = getCurrentPage(index);

  return (
    <>
      <div className="grid grid-cols-1">
        {posts.map((post) => (
          <Card {...post} key={post.url}></Card>
        ))}
      </div>
      <Footer
        prev={prev}
        next={next}
      />
    </>
  );
};

export default Home;
