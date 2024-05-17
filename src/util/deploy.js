import process from "node:process";
import { URL } from "node:url";
import { API } from "@discordjs/core/http-only";
import { REST } from "discord.js";
import { Environment } from "./helpers.js";
import { loadCommands } from "./loaders.js";

import chalk from "chalk";

export const cmdRollout = async () => {
	const env = new Environment();

	const commands = await loadCommands(new URL("../commands/", import.meta.url));
	const commandData = [...commands.values()]
		.filter((c) => !c.type || c.type === "command")
		.map((command) => command.data);

	const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
	const api = new API(rest);

	const result =
		env.getRuntimeScenario() === "development"
			? await api.applicationCommands.bulkOverwriteGuildCommands(
					process.env.APPLICATION_ID,
					process.env.DEV_GUILD,
					commandData,
				)
			: await api.applicationCommands.bulkOverwriteGlobalCommands(process.env.APPLICATION_ID, commandData);

	console.log(
		`${chalk.bold.green("Core")} Successfully registered ${chalk.bold(result.length)} commands (${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })})`,
	);
};
