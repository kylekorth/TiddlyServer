// #!/usr/bin/env node

require("source-map-support/register");
import * as fs from "fs";
import * as path from "path";
import * as server from "./src/server";
import * as yargs from "yargs";

// import fs = require("fs");
// import path = require("path");
import { inspect } from "util";
// import server = require("./src/server");
// import yargs = require("yargs");

console.log(process.pid);
const SETTINGS_FILE = "settings.json";
const argv = yargs
  .usage("./$0 - TiddlyServer")
  .option("config", {
    describe: "Path to the server config file",
    demandOption: false,
    type: "string",
  })
  .option("stay-on-error", {
    describe: "Start a setInterval loop to keep the process\nfrom exiting.",
    demandOption: false,
    type: "boolean",
    default: false,
  })
  .option("dry-run", {
    describe:
      "Do everything except call server.listen().\nUseful for checking settings.",
    demandOption: false,
    default: false,
    type: "boolean",
  }).argv;

const {
  config: userSettings,
  "dry-run": dryRun,
  "stay-on-error": stayOnError,
} = argv;

const settingsFile = userSettings
  ? path.resolve(userSettings)
  : path.join(
    __dirname,
    //if we're in the build directory the default one level up
    __dirname.endsWith("/build") ? ".." : "",
    "settings.json"
  );

const assetsFolder = path.join(__dirname, "assets");

declare const __non_webpack_require__: NodeRequire | undefined;
const nodeRequire =
  typeof __non_webpack_require__ !== "undefined"
    ? __non_webpack_require__
    : require;

const logAndCloseServer = (err: any) => {
  //hold it open because all other listeners should close
  if (stayOnError) setInterval(function () { }, 1000);
  process.exitCode = 1;
  console.error("[ERROR]: caught process uncaughtException", inspect(err));
  try {
    fs.appendFileSync(
      path.join(__dirname, "uncaughtException.log"),
      new Date().toISOString() + "\r\n" + inspect(err) + "\r\n\r\n"
    );
  } catch (e) {
    console.log("Could not write to uncaughtException.log");
  }
};

async function runServer() {
  const settingsDir = path.dirname(settingsFile);
  await server.libsReady;

  const { settings, settingshttps } = server.loadSettings(
    settingsFile,
    assetsFolder,
    Object.keys(server.MainServer.routes)
  );

  const [check, checkErr] = server.checkServerConfig(settings);

  if (!check) {
    console.log(JSON.stringify(checkErr, null, 2));
    debugger;
  }
  let main: server.MainServer;


  // Unhandled rejections with no reasons should be ignored
  process.on("unhandledRejection", (err, _prom) => {
    if (!err) return;
    if (main) main.close(true);
    logAndCloseServer(err);
  });
  process.on("uncaughtException", err => {
    if (main) main.close(true);
    logAndCloseServer(err);
  });
  process.on("beforeExit", () => {
    if (process.exitCode) {
      console.log("Server exited with errors " + process.exitCode);
      return;
    }
  });

  let httpsSettingsFile = settingshttps
    ? path.resolve(settingsDir, settingshttps)
    : false;

  try {
    let [success, _main] = await server.initServer({
      settings,
      settingshttps:
        httpsSettingsFile && nodeRequire(httpsSettingsFile).serverOptions,
      preflighter: fs.existsSync(__dirname + "/preflighter.js")
        ? nodeRequire("./preflighter.js").preflighter
        : undefined,
      dryRun,
    });
    main = _main;
    // auditChildren();
  } catch (e) {
    console.error("[ERROR]: Uncaught error during server startup:", e);
    process.exit(1);
  }
}
function auditChildren() {
  const parents: NodeModule[] = [];
  const inspectModule = (mod: NodeModule) => {
    parents.push(mod);
    mod.children.forEach(e => {
      if (parents.indexOf(e) > -1) return console.log("circular", e, mod);
      else inspectModule(e);
    });
    parents.pop();
  }
  inspectModule(module);
}
if (fs.existsSync(settingsFile)) {
  runServer();
} else {
  logAndCloseServer(
    "[ERROR]: server config file could not be found.\nConsider passing its location via --config\n"
  );
}
