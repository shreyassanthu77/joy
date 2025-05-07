# Joy

A modern static site generator framework based on Rolldown, designed for building fast, flexible static websites with modern JavaScript and TypeScript.

## Packages

- [@joy/core](./packages/core/README.md) - Core framework functionality for building and watching
- [@joy/md](./packages/md/README.md) - Markdown plugin with front matter, syntax highlighting, and layouts

## Features

- **Fast builds** powered by Rolldown bundler
- **Plugin-based architecture** for extensibility
- **File watching** for rapid development
- **Built-in dev server** with live reload
- **Markdown support** with front matter validation
- **Syntax highlighting** via Shiki
- **Layout system** for templating
- **TypeScript support** throughout
- **Simple API** with minimal configuration

## Philosophy

Joy is designed with simplicity and flexibility in mind. It provides a minimal core that handles the build process, routing, and file transformations, while allowing you to extend it with plugins for specific file types.

Unlike monolithic static site generators, Joy gives you complete control over how your content is processed and transformed, making it ideal for custom sites with specific requirements.

## Getting Started

## Install dependencies

### Deno
```bash
deno add jsr:@joy/core
deno add jsr:@joy/md 
```

### Node
```bash
npx jsr add @joy/core
npx jsr add @joy/md
```

## Create a basic build script

### Basic Example

```ts
// build.ts
import { build, watch } from "@joy/core";
import { markdown, type } from "@joy/md";

// Choose build or watch based on environment
const run = Deno.env.get("DEV") === "true" ? watch : build;

await run({
  routesDir: "./content",  // Where your source files are located
  outDir: "./dist",        // Where to output the built files
  transformers: {
    // Pass HTML through unchanged
    ".html": (_, code) => code,
    
    // Transform Markdown to HTML with front matter validation
    ".md": markdown({
      frontMatter: type({
        title: "string",
        description: "string?",
      }),
      layouts: {
        // Define a basic layout
        base(body, { title }) {
          return `<!DOCTYPE html>
            <html>
              <head>
                <title>${title}</title>
                <meta charset="utf-8">
              </head>
              <body>
                ${body}
              </body>
            </html>`;
        },
      },
    }),
  },
});
```

### Content Example

```md
---
title: Hello World
layout: base
---

# Hello World

This is a markdown file that will be transformed to HTML.

## Code Example

```js
console.log("Hello World");
```

## How It Works

1. **Routing**: Joy scans your content directory and creates routes based on file paths
2. **Transformation**: Each file is processed by the appropriate transformer based on its extension
3. **Bundling**: Rolldown bundles the transformed files
4. **Output**: The bundled files are written to the output directory

For development:
1. Joy watches your content directory for changes
2. When a file changes, it's re-transformed and re-bundled
3. The dev server serves the bundled files
4. Connected browsers are notified to reload via WebSocket

## License

MIT
