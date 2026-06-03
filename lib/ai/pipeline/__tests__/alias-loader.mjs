// Test-only ESM loader. Lets Node's native TS runner load the project's
// source modules by:
//   1. resolving the `@/*` path alias (tsconfig "paths") to the project root, and
//   2. appending `.ts`/`.tsx` to extensionless relative/alias imports
//      (the source uses extensionless specifiers like `./config`).
import { existsSync } from 'node:fs';

const root = new URL('../../../../', import.meta.url); // -> <project root>/

function withTsExtension(url) {
  if (/\.[mc]?[jt]sx?$/.test(url)) return url;
  if (existsSync(new URL(url + '.ts'))) return url + '.ts';
  if (existsSync(new URL(url + '.tsx'))) return url + '.tsx';
  return url;
}

export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@/')) {
    return { url: withTsExtension(new URL(spec.slice(2), root).href), shortCircuit: true };
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const url = withTsExtension(new URL(spec, ctx.parentURL).href);
    return { url, shortCircuit: true };
  }
  return next(spec, ctx);
}
