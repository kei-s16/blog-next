import { format, parseISO } from 'date-fns';
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from 'rehype-raw'
import remarkGfm from "remark-gfm";
import { allPosts } from 'contentlayer/generated';

const SITE_DOMAIN = process.env.SITE_DOMAIN ? process.env.SITE_DOMAIN : "blog.k16em.net";
const SITE_NAME = process.env.SITE_NAME ? process.env.SITE_NAME : "blog.k16em.net";

export const generateStaticParams = async () => allPosts.map((post) => ({ slug: post._raw.flattenedPath }))

export const generateMetadata = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post._raw.flattenedPath === params.slug)
  if (!post) throw new Error(`Post not found for slug: ${params.slug}`)

  return {
    title: post.title + " - " + SITE_DOMAIN,
    description: post.description,
    alternates: {
      canonical: post.url,
    },
    openGraph: {
      title: post.title + " - " + SITE_DOMAIN,
      description: post.description,
    }
  }
}

const Article: NextPage = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post._raw.flattenedPath === params.slug);
  if (!post) throw new Error(`Post not found for slug: ${params.slug}`)

  const {title, date, category, tags, description, body} = {...post};

  return (
    <>
      <Head>
        <title>{SITE_NAME}</title>
        <meta name="description" content="blog description" />
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <script data-goatcounter="https://k16em.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
      </Head>
      <body className="space-y-4">
        <header>
          <h1><Link href="/" className="no-underline">{SITE_NAME}</Link></h1>
          <div className="flex flex-row">
            <h3 className="basis-3/4 text-lg">
              {title}
            </h3>
            <p className="basis-1/4 text-xs text-right">{format(parseISO(date), 'LLLL d, yyyy')}</p>
          </div>
          <div className="flex flex-row">
            <p className="mr-2 my-0 p-0">
              <span className="font-medium">category</span> : <Link href={`/categories/${encodeURIComponent(category)}`}>{category}</Link>
            </p>
            <p className="mr-2 my-0 p-0 font-medium">tags : </p>
            <ul className="flex flex-row">
              {tags.map((tag) => (
                <li className="mr-2" key={tag}>
                  <Link href={`/tags/${encodeURIComponent(tag)}`}>{tag}</Link>
                </li>
              ))}
            </ul>
          </div>
          {description && 
              <p><span className="font-medium">description</span> : {description}</p>
          }
          <hr />
        </header>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          className="hyphens-auto content"
        >
          {body.raw}
        </ReactMarkdown>
        <footer>
          <hr />
          <div className="flex flex-row justify-center">powered by next.js</div>
        </footer>
      </body>
    </>
  );
};

export default Article;
