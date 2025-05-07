import type { AdapterOptions, AdapterInstance } from "crossws";
import { type ServerRequest, serve as srvx, type ServerOptions } from "srvx";

export async function serve(
  options: ServerOptions,
  websocketHandlers: Record<string, AdapterOptions>,
) {
  const { fetch, ...rest } = options;
  const wsHandlers = new Map<string, AdapterInstance>();
  for (const [key, options] of Object.entries(websocketHandlers)) {
    const handler = await createWsHandler(options);
    wsHandlers.set(key, handler);
  }
  const server = srvx({
    ...rest,
    fetch(req) {
      const { pathname } = new URL(req.url);
      if (
        req.runtime?.name !== "node" &&
        wsHandlers.has(pathname) &&
        req.headers.get("upgrade") === "websocket"
      ) {
        const handler = wsHandlers.get(pathname)!;
        return upgradeWs(req, handler);
      }
      return fetch(req);
    },
  });

  if (server.node) {
    server.node!.server?.on("upgrade", (req, socket, head) => {
      if (req.headers.upgrade === "websocket") {
        const { pathname } = new URL(
          req.url ?? "/",
          req.headers.host ?? "localhost",
        );
        if (wsHandlers.has(pathname)) {
          const handler = wsHandlers.get(pathname) as NodeAdapter;
          handler.handleUpgrade(req, socket, head);
        }
      }
    });
  }

  return server;
}

import type { DenoAdapter } from "crossws/adapters/deno";
import type { BunAdapter } from "crossws/adapters/bun";
import type { NodeAdapter } from "crossws/adapters/node";

function upgradeWs(req: ServerRequest, handler: AdapterInstance) {
  const runtime = req.runtime!;
  // @ts-ignore ..
  const name = runtime.name ?? (runtime.runtime as string);
  if (name === "deno") {
    const ws = handler as DenoAdapter;
    return ws.handleUpgrade(req, runtime.deno!.info);
  } else if (name === "bun") {
    const ws = handler as BunAdapter;
    return ws.handleUpgrade(req, runtime.bun!.server) as Promise<Response>;
  }
  throw new Error("Unsupported runtime");
}

async function createWsHandler(
  options: AdapterOptions,
): Promise<AdapterInstance> {
  if ("Deno" in globalThis) {
    const mod = await import("crossws/adapters/deno");
    return mod.default(options);
  } else if ("Bun" in globalThis || globalThis.process?.versions?.bun) {
    const mod = await import("crossws/adapters/bun");
    return mod.default(options);
  } else {
    const mod = await import("crossws/adapters/node");
    return mod.default(options);
  }
}
