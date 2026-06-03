// Registers the test-only `@/*` alias loader before the test files load.
import { register } from 'node:module';
register('./alias-loader.mjs', import.meta.url);
