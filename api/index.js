// Vercel serverless entry point. Kept as plain JS (no decorators) so
// Vercel's esbuild-based function bundler never has to deal with
// TypeScript decorator metadata -- that transform is handled ahead of
// time by `tsc` when building the `server` package (see server/tsconfig.json).
// This file only imports the already-compiled server/dist output.
const { getHandler } = require('../server/dist/serverless');

module.exports = async (req, res) => {
  const handler = await getHandler();
  return handler(req, res);
};
