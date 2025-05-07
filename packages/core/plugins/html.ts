import type { Plugin } from "rolldown";
import type { RouteMap } from "../router.ts";
import { join } from "node:path";
import { HTMLRewriter, type Element } from "lol-html";
import { Buffer } from "node:buffer";
import { nanoid } from "../utils/nanoid.ts";

export function htmlPlugin(routeMap: RouteMap, dev: boolean): Plugin {
  type Meta = {
    html: string;
    route: RouteMap["routes"][number];
    placeholder: string;
  };
  return {
    name: "@joy/plugin-html",
    transform: {
      filter: {
        moduleType: {
          include: ["html"],
        },
      },
      handler(code, id, meta) {
        const route = routeMap.fromPath(id);
        const { html, scripts, placeholder } = extractLinksAndScripts(code);

        const js = [];
        if (dev) {
          js.push(`import "joy:dev-script"`);
        }
        for (const script of scripts) {
          js.push(`import "${script}";`);
        }
        return {
          code: js.length === 0 ? undefined : js.join("\n"),
          moduleType: js.length === 0 ? "empty" : "js",
          meta: {
            html,
            route,
            placeholder,
          } satisfies Meta,
        };
      },
    },
    generateBundle(_, bundle) {
      const bundleFiles = new Map<string, string>();
      for (const [key, file] of Object.entries(bundle)) {
        if (file.type !== "chunk" || !file.facadeModuleId) continue;
        bundleFiles.set(file.facadeModuleId, key);
      }

      for (const mod of this.getModuleIds()) {
        const info = this.getModuleInfo(mod);
        if (!info || !info.meta || !info.meta.html) continue;
        const { route, html, placeholder } = info.meta as Meta;
        const related = bundle[bundleFiles.get(mod)!];
        const htmlPath = join(".", route.route, "index.html");
        let replacement: string;
        if (related.type !== "chunk" || related.code === "") {
          replacement = "";
          const key = bundleFiles.get(mod)!;
          delete bundle[key];
        } else {
          replacement = `<script type="module" src="/${related.fileName}"></script>`;
        }
        const htmlFinal = html.replace(`${placeholder}.js`, replacement);
        this.emitFile({
          type: "asset",
          fileName: htmlPath,
          source: htmlFinal,
          originalFileName: mod,
        });
      }
    },
  };
}

interface LinksAndScripts {
  html: string;
  links: string[];
  scripts: string[];
  placeholder: string;
}
function extractLinksAndScripts(code: string): LinksAndScripts {
  const links: string[] = [];
  const scripts: string[] = [];
  const chunks: Uint8Array[] = [];
  const id = nanoid(6);
  const rewriter = new HTMLRewriter("utf-8", (chunk: Uint8Array) => {
    chunks.push(chunk);
  });
  rewriter.on("head", {
    element(el: Element) {
      el.append(`${id}.js`, {
        html: true,
      });
    },
  });
  rewriter.on("script", {
    element(el: Element) {
      const type = el.getAttribute("type");
      if (type !== "module") {
        throw `Scripts in html files must be modules`;
      }
      if (el.hasAttribute("src")) {
        scripts.push(el.getAttribute("src")!);
        el.remove();
        return;
      }
      throw `Bare script elements are not supported`;
    },
  });
  rewriter.on("link", {
    element(el: Element) {
      if (el.hasAttribute("rel") && el.getAttribute("rel") === "stylesheet") {
        links.push(el.getAttribute("href")!);
        el.remove();
      } else if (el.hasAttribute("href")) {
        const href = el.getAttribute("href")!;
        if (href.endsWith(".css")) {
          links.push(href);
          el.remove();
        }
      }
    },
  });

  rewriter.write(Buffer.from(code));
  rewriter.end();
  const html = Buffer.concat(chunks).toString("utf-8");
  return {
    html,
    links,
    scripts,
    placeholder: id,
  };
}
