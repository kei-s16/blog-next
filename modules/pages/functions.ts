import { compareDesc } from 'date-fns';
import { allPosts, Post } from 'contentlayer/generated';

const MAX_ARTICLE_PER_PAGE = process.env.MAX_ARTICLE_PER_PAGE ? parseInt(process.env.MAX_ARTICLE_PER_PAGE) : 5;

/*
 * ペジネーション情報を生成する
 * @params currentPageIndex 現在のペジネーション情報
 * @return 現在のページに表示する記事の配列
 */
export function getCurrentPage (currentPageIndex: number) {
  const posts: Post[] = allPosts.sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))

  const head: number = currentPageIndex * MAX_ARTICLE_PER_PAGE;
  const tail: number = head + MAX_ARTICLE_PER_PAGE;

  const slicedPage: Post[] = posts.slice(head, tail);

  return {
    posts: slicedPage,
    prev: 0 < (currentPageIndex - 1) ? currentPageIndex : currentPageIndex === 1 ? 1 : null,
    next: posts[tail + 1] ? currentPageIndex + 2 : null
  };
}

/*
 * タグ検索のペジネーション情報を生成する
 * @params tag 検索対象のタグ名
 * @params currentPageIndex 現在のペジネーション情報
 * @return 現在のページに表示する記事の配列
 */
export function getCurrentTagPage (tag: string, currentPageIndex: number) {
  const posts: Post[] = allPosts.filter((post) => post.tags.includes(tag))
                          .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))

  const head: number = currentPageIndex * MAX_ARTICLE_PER_PAGE;
  const tail: number = head + MAX_ARTICLE_PER_PAGE;

  const slicedPage: Post[] = posts.slice(head, tail);

  return {
    posts: slicedPage,
    prev: 0 < (currentPageIndex - 1) ? currentPageIndex : currentPageIndex === 1 ? 1 : null,
    next: posts[tail + 1] ? currentPageIndex + 2 : null
  };
}

/*
 * タグ一覧を生成する
 * @return すべてのタグ名
 */
export function getTags () {
  // FIXME: いまいちな気がするので
  const tags: string[] = allPosts
    .map((post) => post.tags.map((tag) => tag))
    .flat()
    .filter((tag, index, array) => array.indexOf(tag) === index)
    .sort(); // アルファベット順

  return tags;
}
