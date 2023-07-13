export type Post = {
  slug: string;
  content: string;
  description: string;
  title: string;
  date: string; // 内部でソートするときに使う
  displayDate: string; // 外に見せるときに使う
};
