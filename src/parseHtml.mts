import { PluggableList } from 'unified';
import { Options as RehypeParseOptions} from 'rehype-parse';

type Options = {
  html?: string
  url?: string
  rehypeParseOption?: RehypeParseOptions;
  /**
   * List of [remark plugins](https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins) to use.
   * See the next section for examples on how to pass options
   */
  remarkPlugins?: PluggableList;
  /**
   * List of [rehype plugins](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md#list-of-plugins) to use.
   * See the next section for examples on how to pass options
   */
  rehypePlugins?: PluggableList;
}

export default async function htmlToMarkdown(options: Options = {}) {
  const { unified } = await (await import ('unified'))
  const rehypeParse = (await import ('rehype-parse')).default
  const rehypeRemark = (await import('rehype-remark')).default
  const remarkStringify = (await import('remark-stringify')).default
  const rehypeIgnore = (await import('rehype-ignore')).default
  const rehypeFormat = (await import('rehype-format')).default
  const remarkGfm = (await import('remark-gfm')).default
  const rehypeVideo = (await import('rehype-video')).default
  const { rehypeParseOption, remarkPlugins = [], rehypePlugins = [] } = options;
  const file = unified()
    .use(rehypeParse, { fragment: true, ...rehypeParseOption })
    .use(rehypeRemark)
    .use(rehypeIgnore)
    .use(remarkGfm)
    .use(rehypeVideo)
    .use(rehypeFormat)
    .use(remarkPlugins || [])
    .use(rehypePlugins || [])
    .use(remarkStringify)
    .processSync(options.html)
  return String(file);
}