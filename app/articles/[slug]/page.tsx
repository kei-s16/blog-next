import { format, parseISO } from 'date-fns';
import type { NextPage, Metadata, ResolvingMetadata } from "next";
import ReactMarkdown from "react-markdown";
import rehypeRaw from 'rehype-raw'
import remarkGfm from "remark-gfm";
import { allPosts } from 'contentlayer/generated';

const SITE_DOMAIN = process.env.SITE_DOMAIN ? process.env.SITE_DOMAIN : "blog.k16em.net";

export const generateStaticParams = async () => allPosts.map((post) => ({ slug: post._raw.flattenedPath }))

export const generateMetadata = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post._raw.flattenedPath === params.slug)
  if (!post) throw new Error(`Post not found for slug: ${params.slug}`)
  return {
    title: post.title + " - " + SITE_DOMAIN,
    description: post.description,
    openGraph: {
      title: post.title + " - " + SITE_DOMAIN,
      description: post.description,
    }
  }
}

const Article: NextPage = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post._raw.flattenedPath === params.slug)
  if (!post) throw new Error(`Post not found for slug: ${params.slug}`)

  return (
    <>
      <header>
        <h2 className="text-xl font-bold">{post.title}</h2>
        <p>{format(parseISO(post.date), 'LLLL d, yyyy')}</p>
      </header>
      <hr />
      {post.description && <p>{post.description}</p>}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        className="hyphens-auto"
      >
        {post.body.raw}
      </ReactMarkdown>
    </>
  );
};

export default Article;
