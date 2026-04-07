export function handleError(fn) {
  return async (argv) => {
    try {
      await fn(argv)
    } catch (err) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  }
}
