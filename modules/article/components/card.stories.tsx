import type { Meta, StoryObj } from '@storybook/react';
import Card from "./card";

const meta = {
  title: 'article/components/card',
  component: Card,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    url: "#",
    title: "hogepiyo",
    date: "2022-12-10T19:00:00",
    tags: ["Qiita"],
    category: "技術"
  },
};
