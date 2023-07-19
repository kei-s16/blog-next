// contentlayer.config.ts
import { defineDocumentType, makeSource } from 'contentlayer/source-files'

export const Post = defineDocumentType(() => ({
  name: 'Post',
  filePathPattern: `**/*.md`,
  fields: {
    title: { type: 'string', required: true },
    date: { type: 'date', required: true },
    category: { type: 'string', required: true },
    tags: { type: 'list', of: { type: 'string' }, required: true },
    description: { type: 'string', required: false },
  },
  computedFields: {
    url: { type: 'string', resolve: (post) => `/articles/${post._raw.flattenedPath}` },
  },
}))

export default makeSource({ contentDirPath: 'contents', documentTypes: [Post] })
