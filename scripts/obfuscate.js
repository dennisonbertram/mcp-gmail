// scripts/obfuscate.js
// Post-processing for bundled Gmail MCP server
// Note: Full obfuscation disabled due to bundle size - esbuild minification is sufficient

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '..', 'dist', 'gmail-mcp.bundle.cjs');

console.log('Post-processing bundle:', inputFile);

// Read the bundle
let bundleContent = fs.readFileSync(inputFile, 'utf8');

// Replace the problematic require('../../package.json') with inline JSON
// This is from mcp-framework trying to get its version
const frameworkPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'mcp-framework', 'package.json'), 'utf8'));
const replacementCode = `{name:"${frameworkPkg.name}",version:"${frameworkPkg.version}"}`;

// Find and replace the require call
// The pattern in minified code is something like: gw("../../package.json").version
// We need to replace just the require part
bundleContent = bundleContent.replace(
  /([a-zA-Z_$][a-zA-Z0-9_$]*)\("\.\.\/\.\.\/package\.json"\)/g,
  replacementCode
);

// Write the modified bundle back
fs.writeFileSync(inputFile, bundleContent);

console.log('✅ Patched framework package.json require');

// Make the file executable
fs.chmodSync(inputFile, 0o755);

// Get file size
const stats = fs.statSync(inputFile);
const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('✅ Bundle ready for distribution!');
console.log('Output file:', inputFile);
console.log(`File size: ${fileSizeInMB} MB`);
console.log('');
console.log('The bundle is already minified by esbuild.');
console.log('Aggressive obfuscation is skipped due to bundle size (would cause memory issues).');
