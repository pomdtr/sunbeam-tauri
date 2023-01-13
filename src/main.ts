import { ITheme, Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebglAddon } from "xterm-addon-webgl";
import { WebLinksAddon } from "xterm-addon-web-links";
import { appWindow } from "@tauri-apps/api/window";
import { AttachAddon } from "./attach";
import {
  http,
  shell,
  clipboard,
  globalShortcut,
  process,
} from "@tauri-apps/api";

const themes = import.meta.glob<ITheme>("./themes/*.json");

async function toggleWindow() {
  if (await appWindow.isVisible()) {
    await appWindow.hide();
  } else {
    await appWindow.show();
    await appWindow.setFocus();
  }
}

async function startSunbeam(host: string, port: number): Promise<shell.Child> {
  const command = new shell.Command(
    "sunbeam-server",
    ["listen", `--host=${host}`, `--port=${port}`],
    {
      env: {
        TERM: "xterm-256color",
      },
    }
  );

  const process = await command.spawn();

  command.stdout.on("data", (data) => {
    console.log("stdout", data);
  });

  command.stderr.on("data", (data) => {
    console.log("stderr", data);
  });

  command.on("error", (error) => {
    console.error("error", error);
  });

  // Wait for the process to start
  let serverStarted = false;
  while (!serverStarted) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      const res = await http.fetch("http://localhost:8080/ready", {
        method: "GET",
        responseType: http.ResponseType.Text,
      });
      if (res.status == 200) {
        serverStarted = true;
      }
    } catch (e) {
      console.log("server not ready yet");
    }
  }

  return process;
}

async function main() {
  const lightTheme = "tomorrow";
  const darkTheme = "tomorrow-night";

  const lightThemeValue = await themes[`./themes/${lightTheme}.json`]();
  const darkThemeValue = await themes[`./themes/${darkTheme}.json`]();

  const host = "localhost";
  const port = 8080;
  await startSunbeam(host, port);
  const terminal = new Terminal({
    macOptionIsMeta: true,
    fontSize: 13,
    scrollback: 0,
    fontFamily: '"Cascadia Code", Menlo, monospace',
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches
      ? darkThemeValue
      : lightThemeValue,
  });

  terminal.open(document.getElementById("terminal")!);

  const fitAddon = new FitAddon();
  const webglAddon = new WebglAddon();
  const webLinksAddon = new WebLinksAddon((_, url) => {
    shell.open(url);
  });

  terminal.loadAddon(fitAddon);
  terminal.loadAddon(webglAddon);

  terminal.loadAddon(webLinksAddon);

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function (e) {
      const newColorScheme = e.matches ? "dark" : "light";
      terminal.options.theme = e.matches ? darkThemeValue : lightThemeValue;
      console.log("new color scheme", newColorScheme);
    });

  try {
    const ws = new WebSocket(`ws://${host}:${port}/ws`);
    const attachAddon = new AttachAddon(ws);
    terminal.loadAddon(attachAddon);

    ws.onopen = () => {
      terminal.focus();
      fitAddon.fit();
    };

    ws.onmessage = async ({ data }) => {
      if (typeof data !== "string") {
        return;
      }

      const payload = JSON.parse(data);
      console.log("action", payload);

      switch (payload.action) {
        case "open-url":
          shell.open(payload.url);
          break;
        case "copy-text":
          clipboard.writeText(payload.text);
          break;
        case "hide":
          await appWindow.hide();
          break;
        default:
          console.error("unknown action", payload.action);
      }
    };

    ws.onclose = () => {
      console.error("Connection closed");
      process.exit(1);
    };

    terminal.onResize(({ rows, cols }) => {
      console.log("resize", rows, cols);
      const payload = new TextEncoder().encode(JSON.stringify({ rows, cols }));
      ws.send(payload);
    });

    window.onresize = () => {
      fitAddon.fit();
    };
  } catch (e) {
    terminal.write(
      "Sunbeam not found! Please install sunbeam and setup your shell."
    );
  }

  terminal.focus();

  window.onblur = () => {
    appWindow.hide();
  };

  if (!(await globalShortcut.isRegistered("CommandOrControl+;"))) {
    await globalShortcut.register("CommandOrControl+;", toggleWindow);
  }

  await appWindow.show();
}

main();
