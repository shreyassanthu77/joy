import type { Route, Transformer } from "@joy/core";

import { Marked } from "marked";
import { extractYaml } from "@std/front-matter";
import { type, type Type } from "arktype";
import { markedHighlight } from "marked-highlight";
import { codeToHtml, type BundledTheme } from "shiki";

/**
 * Base front matter schema that all markdown files must include
 * @internal
 */
const baseFrontMatter: Type<{
  title: string;
  layout?: string | undefined;
}> = type({
  title: "string >= 8",
  layout: "string?",
});
type BaseFrontMatter = typeof baseFrontMatter.infer;

type Pretty<T> = { [K in keyof T]: T[K] } & unknown;

/**
 * Function that processes HTML content with a specific layout
 * 
 * @template frontMatter - The type of the front matter object
 * @param body - The HTML content to wrap in the layout
 * @param frontMatter - The validated front matter object
 * @returns A string or Promise resolving to a string with the final HTML
 */
export type LayoutHandler<frontMatter> = (
  body: string,
  frontMatter: frontMatter,
) => string | Promise<string>;

/**
 * Configuration options for the markdown transformer
 * 
 * @template FM - ArkType schema for front matter validation
 */
export interface MarkdownOptions<FM extends Type> {
  /**
   * ArkType schema for validating front matter
   */
  frontMatter?: FM;
  
  /**
   * Theme for syntax highlighting
   * @default "github-dark"
   */
  shikiTheme?: BundledTheme;
  
  /**
   * Object mapping layout names to layout handler functions
   */
  layouts?: Record<
    string,
    LayoutHandler<Pretty<FM["infer"] & BaseFrontMatter>>
  >;
}

/**
 * Creates a transformer for Markdown files
 * 
 * @example
 * ```ts
 * import { markdown, type } from "@joy/md";
 * 
 * const mdTransformer = markdown({
 *   frontMatter: type({
 *     title: "string",
 *     description: "string?",
 *   }),
 *   shikiTheme: "github-dark",
 *   layouts: {
 *     post(body, frontMatter) {
 *       return `
 *         <article>
 *           <h1>${frontMatter.title}</h1>
 *           ${body}
 *         </article>
 *       `;
 *     },
 *   },
 * });
 * ```
 * 
 * @template FM - ArkType schema for front matter validation
 * @param opts - Configuration options for the markdown transformer
 * @returns A transformer function that converts Markdown to HTML
 */
export function markdown<FM extends Type>(
  opts: MarkdownOptions<FM> = {},
): Transformer {
  const { shikiTheme: theme = "github-dark" } = opts;
  const marked = new Marked().use(
    markedHighlight({
      async: true,
      async highlight(code, lang) {
        const html = await codeToHtml(code, { lang, theme });
        return html;
      },
    }),
  );

  const frontMatter = opts.frontMatter?.and(baseFrontMatter) ?? baseFrontMatter;

  return async function renderMarkdown(route: Route, contents: string) {
    if (!contents.includes("---")) {
      console.error(`No front matter found in ${route.path}. Skipping`);
      return "";
    }
    const { attrs, body } = extractYaml(contents);
    const validated = frontMatter(attrs);
    if (validated instanceof type.errors) {
      for (const error of validated) {
        console.error(error.message);
      }
      console.error(`Invalid front matter in ${route.path}. Skipping`);
      return "";
    }
    const { layout } = validated;
    let html = await marked.parse(body, { gfm: true });
    if (layout) {
      const handler = opts.layouts?.[layout];
      if (!handler) {
        console.error(`No layout handler for ${layout}. Exporting as is`);
        return html;
      }
      // deno-lint-ignore no-explicit-any
      html = await handler(html, validated as any);
    }
    return html;
  };
}

export { type };
