import type { NextPage } from "next";
import Link from "next/link";
import { redirect } from 'next/navigation'
import Card from "modules/article/components/card";
import { getCurrentPage } from "modules/pages/functions";

const Contents: NextPage = ({ params }: { params: { index: number } }) => {
  if (params.index == 1) {
    redirect("/");
  }

  const index = params.index - 1; // 楽にするためURLに使っている値から1を引いたものにする
  const { posts, prev, next } = getCurrentPage(index);

  return (
    <>
      <div className="grid grid-cols-1">
        {posts.map((post) => (
          <Card {...post} key={post.url}></Card>
        ))}
      </div>
      <div className="flex flex-row justify-center">
          <div className="basis-1/3 rounded-lg flex items-center justify-center">{prev && <Link href={`/${prev}`}>previous</Link>}</div>
          <div className="basis-1/3 rounded-lg flex items-center justify-center"><p>◆</p></div>
          <div className="basis-1/3 rounded-lg flex items-center justify-center">{next && <Link href={`/${next}`}>next</Link>}</div>
      </div>
    </>
  );
};

export default Contents;
