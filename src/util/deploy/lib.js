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
	const actions = await loadCommands(new URL("../actions/", import.meta.url));
	const data = [...commands.values(), ...actions.values()].map((command) => command.data);

	const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
	const api = new API(rest);

	const result =
		env.getRuntimeScenario() === "development"
			? await api.applicationCommands.bulkOverwriteGuildCommands(
					process.env.APPLICATION_ID,
					process.env.DEV_GUILD,
					data,
				)
			: await api.applicationCommands.bulkOverwriteGlobalCommands(process.env.APPLICATION_ID, data);

	console.log(
		`${chalk.bold.green("Core")} Successfully registered ${chalk.bold(result.length)} commands/actions (${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })})`,
	);
};
