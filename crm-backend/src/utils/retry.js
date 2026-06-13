'use strict';

/**
 * sleep(ms) — returns a Promise that resolves after ms milliseconds.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * retry(fn, attempts, delayMs)
 *
 * Calls fn() up to `attempts` times.
 * Waits `delayMs` milliseconds between each attempt.
 * Returns the result of the first successful call.
 * Throws the last error if all attempts fail.
 *
 * @param {Function} fn        — async function to retry
 * @param {number}   attempts  — max attempts (default 2)
 * @param {number}   delayMs   — delay between attempts in ms (default 2000)
 */
async function retry(fn, attempts = 2, delayMs = 2000) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}

module.exports = { retry, sleep };
