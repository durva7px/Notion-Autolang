
import * as esbuild from "esbuild";

import {
  copyFile,
  mkdir,
  rm
} from "node:fs/promises";

const watch = process.argv.includes("--watch");

async function copyStaticFiles() {
  await mkdir("dist", { recursive: true });

  const files = [
    "manifest.json",
    "popup.html",
    "popup.css"
  ];

  for (const file of files) {
    await copyFile(file, `dist/${file}`);
  }
}

async function build() {
  await rm("dist", {
    recursive: true,
    force: true
  });

  await copyStaticFiles();

  const config = {
    entryPoints: {
      content: "src/content.js",
      popup: "src/popup.js"
    },

    bundle: true,
    outdir: "dist",
    format: "iife",
    platform: "browser",
    target: ["chrome120"],
    sourcemap: true
  };

  if (watch) {
    const context = await esbuild.context(config);

    await context.watch();

    console.log("Watching for changes...");
    console.log(
      "Rebuild static files by restarting dev mode."
    );
  } else {
    await esbuild.build(config);

    console.log("Extension built successfully!");
  }
}

build().catch(error => {
  console.error(error);
  process.exit(1);
});
