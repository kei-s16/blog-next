import { format, parseISO } from "date-fns";
import type { NextPage } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { allPosts } from "contentlayer/generated";
import Card from "modules/article/components/card";

const SITE_DOMAIN = process.env.SITE_DOMAIN
  ? process.env.SITE_DOMAIN
  : "blog.k16em.net";

export const generateStaticParams = async () =>
  allPosts.map((post) => ({ slug: post._raw.flattenedPath }));

export const generateMetadata = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post._raw.flattenedPath === params.slug);
  if (!post) throw new Error(`Post not found for slug: ${params.slug}`);

  return {
    title: post.title + " - " + SITE_DOMAIN,
    description: post.description,
    alternates: {
      canonical: post.url,
    },
    openGraph: {
      title: post.title + " - " + SITE_DOMAIN,
      description: post.description,
    },
  };
};

const Article: NextPage = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post._raw.flattenedPath === params.slug);
  if (!post) throw new Error(`Post not found for slug: ${params.slug}`);

  const { body } = { ...post };

  return (
    <>
      <header>
        <Card {...post} />
        <hr />
      </header>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        className="hyphens-auto content"
      >
        {body.raw}
      </ReactMarkdown>
    </>
  );
};

export default Article;
