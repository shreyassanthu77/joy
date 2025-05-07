import type { Transformer } from "./plugins/transformer.ts";
import { type BuildOptions, getBuildOptions } from "./shared.ts";
import { rolldown, type RolldownOutput } from "rolldown";
import { Watcher } from "./utils/fs.ts";
import { contentType } from "@std/media-types";
import { serve } from "srvx";
import { ws, upgradeWs } from "./utils/ws.ts";
import type { BunAdapter } from "crossws/adapters/bun";
import type { Peer } from "crossws";

/**
 * Builds a static site and watches for changes, rebuilding when files are modified.
 * Also starts a development server with live reload functionality.
 *
 * @example
 * ```ts
 * import { watch } from "@joy/core";
 *
 * await watch({
 *   routesDir: "./content",
 *   outDir: "./dist",
 *   transformers: {
 *     ".html": (_, code) => code,
 *     // Add more transformers for different file types
 *   },
 * });
 * ```
 *
 * @param options - Configuration options for the build and watch process
 * @returns Promise that resolves when the watcher and server are running
 */
export async function watch<T extends Record<string, Transformer>>(
  options: BuildOptions<T>,
) {
  const { routesDir, options: buildOpts } = getBuildOptions<T>(options, true);
  const bundle = await rolldown(buildOpts);

  console.log(`%cPreparing build...`, "color: blue");
  let build = await bundle.generate({});
  console.log(`%cStarting watcher...`, "color: blue");
  const peers: Set<Peer> = new Set();
  new Watcher([routesDir, ...bundle.watchFiles], async () => {
    console.log(`%c[Watcher] Rebuilding...`, "color: blue");
    const now = performance.now();
    build = await bundle.generate({});
    const elapsed = performance.now() - now;
    console.log(
      `%c[Watcher] Rebuild complete in ${elapsed.toFixed(2)}ms`,
      "color: yellow",
    );

    for (const peer of peers) {
      peer.send("reload");
    }
  });
  console.log("%cStarting dev server", "color: blue");
  await devServer(() => build, peers);
}

/**
 * Creates and starts a development server for previewing the built site.
 * Includes WebSocket connections for live reload functionality.
 *
 * @param getBuild - Function that returns the current build output
 * @param peers - Set of WebSocket peers for live reload
 * @returns Promise that resolves when the server is ready
 * @internal
 */
async function devServer(getBuild: () => RolldownOutput, peers: Set<Peer>) {
  const socket = await ws({
    hooks: {
      open(peer) {
        peers.add(peer);
      },
      close(peer) {
        peers.delete(peer);
      },
      error(peer) {
        peers.delete(peer);
      },
    },
  });
  const server = serve({
    port: 8000,
    fetch(request) {
      let { pathname } = new URL(request.url);
      if (pathname.endsWith("/")) {
        pathname += "index.html";
      }
      pathname = pathname.slice(1);
      const file = getBuild().output.find((file) => file.fileName === pathname);
      if (!file) {
        return new Response("404", {
          status: 404,
          statusText: "Not Found",
        });
      }

      const type = contentType(file.fileName.split(".").pop()!);
      const size =
        file.type === "chunk" ? file.code.length : file.source.length;
      const contents = file.type === "chunk" ? file.code : file.source;

      return new Response(contents, {
        headers: {
          "Content-Type": type ?? "text/plain",
          "Content-Length": size.toString(),
        },
      });
    },
    bun: {
      websocket: (socket as BunAdapter).websocket,
    },
    upgrade(req) {
      const { pathname } = new URL(req.url);
      if (pathname.endsWith("/__dev")) {
        return upgradeWs(req, socket);
      }

      return new Response(null, { status: 404 });
    },
  });

  await server.ready();
}
