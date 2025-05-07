import type { Transformer } from "./plugins/transformer.ts";
import { type BuildOptions, getBuildOptions } from "./shared.ts";
import { rolldown } from "rolldown";

/**
 * Builds a static site using the provided configuration.
 * 
 * @example
 * ```ts
 * import { build } from "@joy/core";
 * 
 * await build({
 *   routesDir: "./content",
 *   outDir: "./dist",
 *   transformers: {
 *     ".html": (_, code) => code,
 *     // Add more transformers for different file types
 *   },
 * });
 * ```
 * 
 * @param options - Configuration options for the build
 * @returns Promise that resolves when the build is complete
 */
export async function build<T extends Record<string, Transformer>>(
  options: BuildOptions<T>,
) {
  const { buildDir, options: buildOpts } = getBuildOptions<T>(options, false);
  const bundle = await rolldown(buildOpts);

  await bundle.write({
    dir: buildDir,
    minify: true,
  });
}
