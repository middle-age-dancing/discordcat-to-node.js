import * as fs from "node:fs/promises";
import readline from "readline";
import { fileURLToPath } from "url";
import { dirname } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import TOML from "@iarna/toml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CFG_FLAG = "configure";
const USERNAME_FLAG = "username";
const CHANNEL_FLAG = "channel";
const FILE_FLAG = "file";
const FILENAME_FLAG = "filename";
const WEBHOOK_FLAG = "webhook_url";

const args = yargs(hideBin(process.argv))
  .option(CFG_FLAG, { type: "boolean", describe: "Setup the configuration" })
  .option(USERNAME_FLAG, { type: "string", describe: "Username" })
  .option(CHANNEL_FLAG, { type: "string", alias: "c", describe: "Channel" })
  .option(FILE_FLAG, { type: "string", alias: "f", describe: "File" })
  .option(FILENAME_FLAG, { type: "string", describe: "Filename" })
  .option(WEBHOOK_FLAG, { type: "string", describe: "Webhook URL" }).argv;

(async () => {
  if (args[CFG_FLAG]) {
    await configureDiscordWebhook();
    process.exit(0);
  }

  const setting = await loadSetting();

  const username = args[USERNAME_FLAG] || "";

  const channel = args[CHANNEL_FLAG] || setting.default_channel;

  const webhookUrl = args[WEBHOOK_FLAG] || setting.channels[channel] || "";

  if (!webhookUrl) {
    console.error("\x1b[01;31mUnknown channel\x1b[0m");
    process.exit(1);
  }

  if (args[FILE_FLAG]) {
    const filename = args[FILENAME_FLAG] || "";
    const filepath = args[FILE_FLAG];
    await sendFile(filepath, filename, webhookUrl);
    process.exit(0);
  }

  let pipeArg = await readFromStdin();

  if (pipeArg.endsWith("\n")) {
    pipeArg = pipeArg.slice(0, -1);
  }

  const msg = {
    content: pipeArg,
    username: username || "bot",
  };

  await sendMessage(msg, webhookUrl);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function configureDiscordWebhook() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  process.stdout.write("Nickname for channel: ");
  const channelName = await rl[Symbol.asyncIterator]()
    .next()
    .then((res) => res.value.trim());

  process.stdout.write("Please input webhook url: ");
  const webhookUrl = await rl[Symbol.asyncIterator]()
    .next()
    .then((res) => res.value.trim());
  rl.close();

  const configPath = getConfigPath();
  let configFilePresent = true;

  try {
    await fs.stat(configPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      configFilePresent = false;
    } else {
      throw error;
    }
  }

  if (!configFilePresent) {
    const setting = {
      default_channel: channelName,
      channels: { [channelName]: webhookUrl },
    };

    await fs.writeFile(configPath, TOML.stringify(setting));
  } else {
    const configContent = await fs.readFile(configPath, {
      encoding: "utf-8",
    });
    const setting = TOML.parse(configContent);
    setting.channels[channelName] = webhookUrl;

    await fs.writeFile(configPath, TOML.stringify(setting));
  }
}

async function readFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function getConfigPath() {
  const home = __dirname;
  return `${home}/.discordcat`;
}

async function loadSetting() {
  const configPath = getConfigPath();
  const content = await fs.readFile(configPath, { encoding: "utf-8" });
  const setting = TOML.parse(content);
  return setting;
}

async function sendFile(filepath, filename, webhookUrl) {
  const form = new FormData();
  const file = await fs.readFile(filepath);
  const finalFilename = filename || filepath;

  form.append("file", new Blob([file]), finalFilename);

  const response = await fetch(webhookUrl, {
    method: "POST",
    body: form,
  });

  if (response.status === 200) {
    console.log("\x1b[01;32mSend file\x1b[0m");
  } else {
    console.error('\x1b[01;31mFailed send file "%s"\x1b[0m', response.status);
  }
}

async function sendMessage(msg, webhookUrl) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    body: JSON.stringify(msg),
    headers: {
      "Content-type": "application/json",
    },
  });
  if (response.status === 204) {
    console.log('\x1b[01;32mSend message "%s"\x1b[0m', msg.content);
  } else {
    console.error('\x1b[01;31mFailed send message "%s"\x1b[0m', msg.content);
  }
}
