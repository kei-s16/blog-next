import type { Meta, StoryObj } from '@storybook/react';
import Footer from "./footer";

const meta = {
  title: 'article/components/footer',
  component: Footer,
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    prev: 1,
    next: 3
  },
}

export const WithPrevPage: Story = {
  args: {
    prev: 1
  },
}

export const WithNextPage: Story = {
  args: {
    next: 3
  },
}

export const NoOtherPage: Story = {}

