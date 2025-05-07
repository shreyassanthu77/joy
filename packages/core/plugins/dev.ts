import type { Plugin } from "rolldown";

export function devPlugin(): Plugin {
  return {
    name: "@joy/dev-plugin",
    resolveId: {
      filter: {
        id: /^joy:dev-script$/,
      },
      handler(id) {
        return { id };
      },
    },
    load: {
      filter: {
        id: /^joy:dev-script$/,
      },
      async handler() {
        const script = await fetch(import.meta.resolve("./dev-script.ts")).then(
          (res) => res.text(),
        );
        return {
          code: script,
          moduleType: "js",
        };
      },
    },
  };
}
