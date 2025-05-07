import type { Plugin } from "rolldown";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

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
        const url = import.meta.resolve("./dev-script.ts");
        const path = fileURLToPath(url);
        const script = await readFile(path, "utf-8");
        return {
          code: script,
          moduleType: "js",
        };
      },
    },
  };
}
