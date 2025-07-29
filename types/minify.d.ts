export type MinimizedResult = import("./index.js").MinimizedResult;
export type InternalResult = import("./index.js").InternalResult;
/** @typedef {import("./index.js").MinimizedResult} MinimizedResult */
/** @typedef {import("./index.js").InternalResult} InternalResult */
/**
 * @template T
 * @param {import("./index.js").InternalOptions<T>} options Options
 * @returns {Promise<InternalResult>} Promise with internal result
 */
export function minify<T>(
  options: import("./index.js").InternalOptions<T>,
): Promise<InternalResult>;
/**
 * @param {string} options Options string
 * @returns {Promise<InternalResult>} Promise with internal result
 */
export function transform(options: string): Promise<InternalResult>;
