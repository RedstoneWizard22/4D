/** Returns a promise that resolves after `ms` milliseconds */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { sleep };
