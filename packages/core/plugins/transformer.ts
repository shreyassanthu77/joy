import { readFile } from "node:fs/promises";
import type { Plugin } from "rolldown";
import type { RouteMap, Route } from "../router.ts";

/**
 * A function that transforms content from one format to another.
 * 
 * @param route - Object containing information about the current route
 * @param code - The file contents as a string
 * @returns A string or Promise resolving to a string with the transformed content
 */
export type Transformer = (
  route: Route,
  code: string,
) => string | Promise<string>;

/**
 * Converts a transformer function into a Rolldown plugin.
 * 
 * @param ext - The file extension to transform (without the dot)
 * @param routeMap - The route map for the project
 * @param transformer - The transformer function to use
 * @returns A Rolldown plugin that applies the transformer
 * @internal
 */
export function transfromerToPlugin(
  ext: string,
  routeMap: RouteMap,
  transformer: Transformer,
): Plugin {
  const name = `transformer_${ext}`;
  const extRe = new RegExp(`\\.${ext}$`);
  return {
    name,
    resolveId: {
      filter: {
        id: extRe,
      },
      handler(id) {
        return { id };
      },
    },
    load: {
      filter: {
        id: extRe,
      },
      async handler(id) {
        const contents = await readFile(id, "utf8");
        return {
          code: contents,
          moduleType: name,
        };
      },
    },
    transform: {
      filter: {
        moduleType: {
          include: [name],
        },
      },
      async handler(code, id) {
        const route = routeMap.fromPath(id);
        try {
          const transformed = await transformer(route, code);
          return {
            code: transformed,
            moduleType: "html",
          };
        } catch (e) {
          this.error(String(e));
        }
      },
    },
  };
}
