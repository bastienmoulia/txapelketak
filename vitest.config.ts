import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// @angular/fire/firestore pre-bundles @firebase/firestore/dist/index.node.mjs which
// includes @grpc/grpc-js — a Node.js-only library that fails in browsers.
//
// This plugin redirects all imports of @angular/fire/firestore to a lightweight
// browser-compatible stub, bypassing the problematic pre-bundled version entirely.
export default defineConfig({
  plugins: [
    {
      name: 'angular-fire-browser-stub',
      enforce: 'pre',
      resolveId(id) {
        if (id === '@angular/fire/firestore') {
          return resolve(import.meta.dirname, 'src/app/testing/angular-fire-firestore.stub.ts');
        }
      },
    },
  ],
});
