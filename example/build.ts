import { build, watch } from "@joy/core";
import { type, markdown } from "@joy/md";
import process from "node:process";

const run = process.env.DEV === "true" ? watch : build;

await run({
  routesDir: "./example/posts",
  outDir: "./example/build",
  transformers: {
    ".html": (_, code) => code,
    ".md": markdown({
      frontMatter: type({
        title: "string",
      }),
      layouts: {
        base(body, { title }) {
          return `<html>
						<head>
							<title>${title}</title>
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
