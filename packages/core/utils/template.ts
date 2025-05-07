import { readFile } from "node:fs/promises";
/**
 * Simple templating utility that replaces placeholders in a file with provided values.
 *
 * @example
 * ```ts
 * // template.html contains: <h1>{title}</h1><p>{content}</p>
 *
 * const html = await template("template.html", {
 *   title: "Hello World",
 *   content: "This is a templated page"
 * });
 *
 * // Result: <h1>Hello World</h1><p>This is a templated page</p>
 * ```
 *
 * @param file - Path to the template file
 * @param replacements - Object with keys matching placeholders in the template
 * @returns Promise resolving to the processed template string
 */
export async function template<T extends Record<string, string>>(
  file: string,
  replacements: T,
): Promise<string> {
  let contents = await readFile(file, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    contents = contents.replaceAll(`{${key}}`, value);
  }
  return contents;
}
