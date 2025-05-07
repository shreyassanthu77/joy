import process from "node:process";
import { type SkipFn, generateRouteMap } from "./router.ts";
import { join, resolve } from "node:path";
import {
  transfromerToPlugin,
  type Transformer,
} from "./plugins/transformer.ts";
import type { BuildOptions as RolldownBuildOptions } from "rolldown";
import { htmlPlugin } from "./plugins/html.ts";
import { devPlugin } from "./plugins/dev.ts";

/**
 * Configuration options for building or watching a site.
 *
 * @template T - Record of file extensions to transformer functions
 */
export interface BuildOptions<T extends Record<string, Transformer>> {
  /**
   * Base directory for the project (defaults to current working directory)
   */
  baseDir?: string;

  /**
   * Directory containing source files (defaults to "routes")
   */
  routesDir?: string;

  /**
   * Directory where built files will be output (defaults to "build")
   */
  outDir?: string;

  /**
   * Functions to determine which paths should be skipped during build
   */
  skipPaths?: SkipFn[];

  /**
   * Object mapping file extensions to transformer functions
   */
  transformers: T;
}

/**
 * Internal result object containing processed build options
 * @internal
 */
export interface Result {
  baseDir: string;
  routesDir: string;
  buildDir: string;
  options: RolldownBuildOptions;
}

/**
 * Processes build options and creates Rolldown configuration
 *
 * @param options - User-provided build options
 * @param dev - Whether to enable development mode
 * @returns Processed build options and Rolldown configuration
 * @internal
 */
export function getBuildOptions<T extends Record<string, Transformer>>(
  options: BuildOptions<T>,
  dev = false,
): Result {
  const baseDir = options.baseDir ? resolve(options.baseDir) : process.cwd();
  const routesDir = join(baseDir, options.routesDir ?? "routes");
  const buildDir = join(baseDir, options.outDir ?? "build");
  const extensions = Object.keys(options.transformers).map((e) => {
    return e[0] !== "." ? `.${e}` : e;
  });

  const routes = generateRouteMap({
    extensions,
    routesDir,
    skips: options.skipPaths ?? [],
  });
  const plugins = Object.entries(options.transformers).map(
    ([ext, transformer]) => {
      if (ext.startsWith(".")) {
        ext = ext.slice(1);
      }
      return transfromerToPlugin(ext, routes, transformer);
    },
  );
  return {
    baseDir,
    routesDir,
    buildDir,
    options: {
      plugins: [
        ...plugins,
        htmlPlugin(routes, dev),
        ...(dev ? [devPlugin()] : []),
      ],
      input: routes.routes.map((r) => r.path),
    },
  };
}
