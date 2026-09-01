import { readFile, writeFile } from "node:fs/promises";

const files = [
  ".vercel/output/functions/__server.func/_ssr/ssr.mjs",
  ".vercel/output/functions/__server.func/_ssr/ssr2.mjs",
  "node_modules/.nitro/vite/services/ssr/assets/ssr.mjs",
  "node_modules/.nitro/vite/services/ssr/assets/ssr2.mjs",
];

const EXPORT_ALL = `function __exportAll$1(all, no_symbols) {
	let target = {};
	for (var name in all) Object.defineProperty(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) Object.defineProperty(target, Symbol.toStringTag, { value: "Module" });
	return target;
}
`;

for (const file of files) {
  try {
    let source = await readFile(file, "utf8");
    let changed = false;

    if (source.includes("ssr_exports as s") && !/var ssr_exports\s*=/.test(source)) {
      source = source.replace("ssr_exports as s", "server_default as s");
      changed = true;
    }

    if (source.includes('import { c as __exportAll$1 } from "./ssr.mjs"')) {
      source = source.replace(
        /import \{ c as __exportAll\$1 \} from "\.\/ssr\.mjs";\n/,
        EXPORT_ALL,
      );
      changed = true;
    }

    if (changed) {
      await writeFile(file, source);
      console.log("[patch-ssr] fixed", file);
    }
  } catch {
    /* file may not exist in this build */
  }
}
