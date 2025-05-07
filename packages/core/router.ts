import { ls, extname, parse } from "./utils/fs.ts";
import { relative } from "node:path";
import { join as posixJoin } from "node:path/posix";

/**
 * Represents a route in the static site
 */
export type Route = {
  /**
   * The URL path for the route
   */
  route: string;
  
  /**
   * The file extension
   */
  ext: string;
  
  /**
   * The absolute file path
   */
  path: string;
  
  /**
   * The directory containing the file
   */
  dir: string;
};

/**
 * Function that determines whether a file path should be skipped during build
 */
export type SkipFn = (path: string) => boolean;

/**
 * Options for generating a route map
 */
export interface GenerateOptions {
  /**
   * Directory containing source files
   */
  routesDir: string;
  
  /**
   * File extensions to include
   */
  extensions: string[];
  
  /**
   * Functions to determine which paths should be skipped
   */
  skips: SkipFn[];
}

/**
 * Manages the mapping between file paths and routes
 */
export class RouteMap {
  /**
   * Array of all routes in the project
   */
  routes: Route[];
  #routeToIdx: Map<string, number>;
  #pathToIdx: Map<string, number>;

  /**
   * @param routes - Array of routes
   * @param map - Map from route strings to array indices
   * @internal
   */
  constructor(routes: Route[], map: Map<string, number>) {
    this.routes = routes;
    this.#routeToIdx = map;
    this.#pathToIdx = new Map();
    for (let i = 0; i < routes.length; i++) {
      this.#pathToIdx.set(routes[i].path, i);
    }
  }

  /**
   * Gets a route by its file path
   * 
   * @param path - The file path
   * @returns The corresponding route
   */
  fromPath(path: string): Route {
    const idx = this.#pathToIdx.get(path)!;
    return this.routes[idx];
  }

  /**
   * Gets a route by its URL path
   * 
   * @param route - The URL path
   * @returns The corresponding route
   */
  fromRoute(route: string): Route {
    const idx = this.#routeToIdx.get(route)!;
    return this.routes[idx];
  }
}

/**
 * Generates a route map from a directory of files
 * 
 * @param options - Options for generating the route map
 * @returns A RouteMap object
 * @internal
 */
export function generateRouteMap({
  extensions,
  skips,
  routesDir,
}: GenerateOptions): RouteMap {
  const skip = mergeSkips(skips);
  const exts = new Set(
    extensions.map((ext) => (ext[0] !== "." ? `.${ext}` : ext)),
  );

  const entires = ls(routesDir, (path) => {
    return exts.has(extname(path)) && !skip(path);
  });

  const routes = new Array<Route>();
  const map = new Map<string, number>();
  for (const path of entires) {
    const { ext, base, dir } = parse(path);
    const route = posixJoin(
      "/",
      relative(routesDir, dir),
      base === "index" ? "" : base,
    );

    if (map.has(route)) {
      const idx = map.get(route)!;
      const existing = routes[idx]!;

      // prettier-ignore
      console.warn(`
%cThe following files both map to the same route "${route}"
  - ${existing.path}
  - ${path}

%cNOTE: skipping ${path}
the file picked might change from run to run, please make sure to rename/delete one of them.
`.trim(), "color: yellow", "color: red");
      continue;
    }
    routes.push({
      route,
      ext,
      dir,
      path,
    });
    map.set(route, routes.length - 1);
  }

  return new RouteMap(routes, map);
}

/**
 * Combines multiple skip functions into a single function
 * 
 * @param skips - Array of skip functions
 * @returns A single skip function that returns true if any of the input functions return true
 * @internal
 */
function mergeSkips(skips: SkipFn[]): SkipFn {
  if (skips.length === 1) {
    return skips[0];
  }
  return function $skip(path: string) {
    if (skips.length === 0) {
      return false;
    }
    for (const skip of skips) {
      if (skip(path)) {
        return true;
      }
    }
    return false;
  };
}
