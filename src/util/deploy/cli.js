import "temporal-polyfill/global";

import process from "node:process";
import { API } from "@discordjs/core/http-only";
import { REST } from "discord.js";
import { Environment } from "../helpers.js";
import { cmdRollout } from "./lib.js";

import chalk from "chalk";

const undeploy = async () => {
	const env = new Environment();

	const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
	const api = new API(rest);

	env.getRuntimeScenario() === "development"
		? await api.applicationCommands.bulkOverwriteGuildCommands(process.env.APPLICATION_ID, process.env.DEV_GUILD, [])
		: await api.applicationCommands.bulkOverwriteGlobalCommands(process.env.APPLICATION_ID, []);

	console.log(
		`${chalk.bold.green("Script")} Successfully ${chalk.bold.red("undeployed")} commands/actions (${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })})`,
	);
};

const arg = process.argv[process.argv.length - 1];

(async () => {
	if (arg === "undeploy") undeploy();
	if (arg === "deploy") cmdRollout();
})();
