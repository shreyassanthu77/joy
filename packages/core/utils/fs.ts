import { readdirSync } from "node:fs";
import { resolve, parse as parsePath, type ParsedPath } from "node:path";
import { watch, type FileChangeInfo } from "node:fs/promises";

export function ls(dir: string, include: (path: string) => boolean) {
  const results: string[] = [];

  const list = readdirSync(dir, { recursive: true });
  for (const entry of list) {
    const path = entry.toString();
    const fullPath = resolve(dir, path);
    if (include(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

const parseCache = new Map<string, ParsedPath>();
export function parse(path: string) {
  if (parseCache.has(path)) {
    return parseCache.get(path)!;
  }
  const parsed = parsePath(path);
  parsed.base = parsed.base.replace(new RegExp(`${parsed.ext}$`), "");
  parseCache.set(path, parsed);
  return parsed;
}

export function extname(path: string) {
  if (parseCache.has(path)) {
    return parseCache.get(path)!.ext;
  }
  const parsed = parse(path);
  return parsed.ext;
}

// deno-lint-ignore no-namespace
export namespace Watcher {
  export type Info = FileChangeInfo<string>;
}

export class Watcher {
  #controller = new AbortController();
  #watchingDirs = new Set<string>();
  handler: (info: Watcher.Info[]) => void | Promise<void>;
  debounce = 100;

  constructor(
    paths: string[],
    handler: (info: Watcher.Info[]) => void | Promise<void>,
  ) {
    this.handler = handler;
    for (const path of paths) {
      this.add(path);
    }
  }

  add(path: string) {
    const { dir, ext, root } = parse(path);
    if (root === "") return;
    let temp = ext === "" ? path : dir;
    while (temp !== root) {
      const parent = resolve(temp, "..");
      if (this.#watchingDirs.has(parent)) {
        return;
      }
      temp = parent;
    }
    this.#watch(ext === "" ? path : dir);
  }

  end() {
    this.#controller.abort();
  }

  async #watch(dir: string) {
    const watcher = watch(dir, {
      recursive: true,
      encoding: "utf8",
      signal: this.#controller.signal,
    });

    for await (const event of watcher) {
      this.#handler(event);
    }
  }

  #timeout: number | undefined;
  #infos: Watcher.Info[] = [];
  #handler(info: Watcher.Info) {
    this.#infos.push(info);
    if (this.#timeout) {
      clearTimeout(this.#timeout);
    }
    this.#timeout = setTimeout(
      this.#debouncedHandler.bind(this),
      this.debounce,
    );
  }

  async #debouncedHandler() {
    await this.handler(this.#infos);
    this.#infos.length = 0;
  }
}
