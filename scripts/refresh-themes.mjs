#!/usr/bin/env node

import degit from "degit";
import path from "path";
import fs from "fs/promises";
import os from "os";
import _ from "lodash";

const targetDir = process.argv[2];

const replacementMap = {
  "terminal.foreground": "foreground",
  "terminal.background": "background",
  "terminal.ansiBlack": "black",
  "terminal.ansiBlue": "blue",
  "terminal.ansiCyan": "cyan",
  "terminal.ansiGreen": "green",
  "terminal.ansiMagenta": "magenta",
  "terminal.ansiRed": "red",
  "terminal.ansiWhite": "white",
  "terminal.ansiYellow": "yellow",
  "terminal.ansiBrightBlack": "brightBlack",
  "terminal.ansiBrightBlue": "brightBlue",
  "terminal.ansiBrightCyan": "brightCyan",
  "terminal.ansiBrightGreen": "brightGreen",
  "terminal.ansiBrightMagenta": "brightMagenta",
  "terminal.ansiBrightRed": "brightRed",
  "terminal.ansiBrightWhite": "brightWhite",
  "terminal.ansiBrightYellow": "brightYellow",
  "terminal.selectionBackground": "selectionBackground",
  "terminalCursor.foreground": "cursor",
};

const vscodeDir = await fs.mkdtemp(path.join(os.tmpdir(), "vscode-themes"));

console.log("Downloading themes...");
const downloader = degit("mbadolato/iTerm2-Color-Schemes/vscode");
await downloader.clone(vscodeDir);

const entries = await fs.readdir(vscodeDir);
console.log(`Converting ${entries.length} themes...`);
const promises = entries.map(async (theme) => {
  const filepath = path.join(vscodeDir, theme);
  const content = await fs.readFile(filepath, "utf-8");
  const vscodeTheme = JSON.parse(content);
  const xtermTheme = {};

  for (const [key, color] of Object.entries(
    vscodeTheme["workbench.colorCustomizations"]
  )) {
    xtermTheme[replacementMap[key]] = color;
  }

  const { name, ext } = path.parse(theme);
  const clean = _.kebabCase(name);
  await fs.writeFile(
    path.join(targetDir, `${clean}${ext}`),
    JSON.stringify(xtermTheme, null, 2)
  );
});

await Promise.all(promises);
await fs.rm(vscodeDir, { recursive: true, force: true });
console.log("Done!");
