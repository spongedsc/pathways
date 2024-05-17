import { Events } from "discord.js";
import chalk from "chalk";

/** @type {import('./index.js').Event<Events.InteractionCreate>} */
export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const client = interaction.client;
		const commands = client.commands;

		if (interaction.isCommand()) {
			const command = commands.get(interaction.commandName);

			if (!command) {
				throw new Error(`Command '${interaction.commandName}' not found.`);
			}

			await command.execute(interaction).catch((e) => {
				console.log(
					`${chalk.bold.red("Command")} exception (${interaction.commandName}): \n`,
					e,
					` ${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })}`,
				);
			});
		}
	},
};
