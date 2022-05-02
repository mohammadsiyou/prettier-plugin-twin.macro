const esbuild = require("esbuild");
const path = require("path");

esbuild.build({
  entryPoints: [path.resolve(__dirname, "../src/index.ts")],
  outfile: path.resolve(__dirname, "../dist/index.js"),
  bundle: true,
  platform: "node",
  target: "node12.13.0",
  external: ["prettier"],
  minify: process.argv.includes("--minify"),
  watch: process.argv.includes("--watch"),
});
