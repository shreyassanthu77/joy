# @joy/md

Markdown plugin for Joy, a static site generator framework.

## Features

- Transform Markdown files to HTML
- Front matter support with validation
- Syntax highlighting via Shiki
- Custom layout system
- YAML front matter extraction and validation

## Usage

```ts
import { build } from "@joy/core";
import { markdown, type } from "@joy/md";

await build({
  input: "content",
  output: "dist",
  plugins: {
    md: markdown({
      // Custom front matter schema (optional)
      frontMatter: type({
        title: "string >= 8",
        description: "string?",
        date: "string",
      }),
      
      // Syntax highlighting theme
      shikiTheme: "github-dark",
      
      // Custom layouts
      layouts: {
        post: (content, frontMatter) => `
          <article>
            <h1>${frontMatter.title}</h1>
            <div>${content}</div>
          </article>
        `,
      }
    })
  }
});
```

## API

- `markdown()` - Creates a transformer for Markdown files
- `type` - Re-export of arktype for front matter validation

## Dependencies

- marked - Markdown parsing
- shiki - Syntax highlighting
- arktype - Type validation

## License

MIT
