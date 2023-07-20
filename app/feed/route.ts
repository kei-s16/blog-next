import { compareDesc } from 'date-fns';
import Rss from "rss";
import { allPosts, Post } from 'contentlayer/generated';

const SITE_DOMAIN = process.env.SITE_DOMAIN ? process.env.SITE_DOMAIN : "blog.k16em.net";
const SITE_NAME = process.env.SITE_NAME ? process.env.SITE_NAME : "blog.k16em.net";
const SITE_DESCRIPTION = process.env.SITE_DESCRIPTION ? process.env.SITE_DESCRIPTION : "blog.k16em.net";

export async function GET() {
  const posts: Post[] = allPosts.sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))

  const feed = new Rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    feed_url: `${SITE_DOMAIN}/feed`,
    site_url: SITE_DOMAIN,
    language: "ja",
  });

  posts.forEach((post) => {
    feed.item({
      title: post.title,
      description: post.description ? post.description : '',
      url: `${post.url}`,
      guid: `${post.url}`,
      date: post.date,
    });
  });

  return new Response(feed.xml(), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
