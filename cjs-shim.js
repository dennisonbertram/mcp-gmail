// CJS shim for import.meta.url
// This file is injected by esbuild to provide ESM-like globals in CommonJS

import { fileURLToPath } from 'url';
import { createRequire } from 'module';

export const import_meta_url = (typeof document === 'undefined' ? 'file://' + __filename : (document.currentScript && document.currentScript.src || new URL('cjs-shim.js', document.baseURI).href));
export const __import_meta_url_polyfill = import_meta_url;
