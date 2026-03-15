// Browser-compatible stub for @angular/fire/firestore.
//
// @angular/fire/firestore's pre-bundled version uses @firebase/firestore/dist/index.node.mjs
// which includes @grpc/grpc-js — a Node.js-only library that throws errors in browsers.
//
// This stub is used in tests (via a Vite plugin alias in vitest.config.ts) to replace
// the entire module with lightweight no-ops. Components use `inject(Firestore, { optional: true })`
// so Angular DI returns null when no provider is registered, and all Firestore code
// paths are safely skipped during tests.

export class Firestore {}
export const collection = () => null;
export const collectionData = () => null;
export const addDoc = () => Promise.resolve();
export const deleteDoc = () => Promise.resolve();
export const doc = () => null;
export const docData = () => null;
export const getDocs = () => Promise.resolve({ docs: [] });
export const getDoc = () => Promise.resolve(null);
export const limit = () => null;
export const orderBy = () => null;
export const query = () => null;
export const setDoc = () => Promise.resolve();
export const updateDoc = () => Promise.resolve();
export const where = () => null;
