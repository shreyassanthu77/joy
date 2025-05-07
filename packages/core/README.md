# @joy/core

Core package for Joy, a static site generator framework based on Rolldown.

## Features

- Build static websites with modern JavaScript/TypeScript
- Plugin-based architecture for extensibility
- File watching for development
- Built-in templating system
- Routing system for organizing pages

## Usage

```ts
import { build, watch } from "@joy/core";

// Build your site
await build({
  input: "src",
  output: "dist",
  plugins: {
    // Your plugins here
  }
});

// Or watch for changes during development
await watch({
  input: "src",
  output: "dist",
  plugins: {
    // Your plugins here
  }
});
```

## API

- `build()` - Build your static site
- `watch()` - Watch for changes and rebuild
- `template()` - Simple templating utility
- `Transformer` - Plugin interface for transforming content

## License

MIT