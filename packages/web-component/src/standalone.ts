// Bundled browser entry for no-build/CDN consumers. The normal package entry
// keeps @bidilens/core external so application bundlers can deduplicate it;
// this entry deliberately includes core so a browser can load one URL without
// an import map or bare-module resolver.
export * from './index.js';
