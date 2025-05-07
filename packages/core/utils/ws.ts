import type { AdapterOptions, AdapterInstance } from "crossws";
import type { ServerRequest } from "srvx";
import type { DenoAdapter } from "crossws/adapters/deno";
import type { BunAdapter } from "crossws/adapters/bun";
import type { NodeAdapter } from "crossws/adapters/node";

type PromiseOr<T> = T | Promise<T>;
export async function upgradeWs(
  req: ServerRequest,
  h: PromiseOr<AdapterInstance>,
) {
  const handler = await h;
  const runtime = req.runtime!;
  // @ts-ignore ..
  const name = runtime.name ?? (runtime.runtime as string);
  if (name === "deno") {
    const ws = handler as DenoAdapter;
    return ws.handleUpgrade(req, runtime.deno!.info);
  } else if (name === "bun") {
    const ws = handler as BunAdapter;
    return ws.handleUpgrade(req, runtime.bun!.server) as Promise<Response>;
  } else {
    const ws = handler as NodeAdapter;
    // @ts-ignore it exists
    const { socket, header } = req.runtime!.node!.upgrade!;
    return ws.handleUpgrade(
      req.runtime!.node!.req,
      socket,
      header,
    ) as unknown as Promise<Response>;
  }
}

export async function ws(options: AdapterOptions): Promise<AdapterInstance> {
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
