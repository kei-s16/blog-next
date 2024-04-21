import type { Meta, StoryObj } from '@storybook/react';
import Card from "./card";

const meta = {
  title: 'article/components/card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    url: "#",
    title: "hogepiyo",
    date: "2022-12-10T19:00:00",
    tags: ["Qiita"],
    category: "技術",
    description: "2022年に買ってよかったものについてまとめています"
  },
};

export const NoDescription: Story = {
  args: {
    url: "#",
    title: "hogepiyo",
    date: "2022-12-10T19:00:00",
    tags: ["Qiita"],
    category: "技術"
  },
};

export const MultipleTags: Story = {
  args: {
    url: "#",
    title: "hogepiyo",
    date: "2022-12-10T19:00:00",
    tags: ["Qiita", "GitHubActions"],
    category: "技術"
  },
};

