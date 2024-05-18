import { Events } from "discord.js";
import chalk from "chalk";

/** @type {import('./index.js').Event<Events.InteractionCreate>} */
export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const client = interaction.client;
		const commands = client.commandsMap;
		const actions = client.actionsMap;

		if (interaction.isContextMenuCommand()) {
			const action = actions.get(interaction.commandName);

			if (!action) {
				throw new Error(`Action '${interaction.commandName}' not found.`);
			}

			await action.execute(interaction).catch((e) => {
				console.log(
					`${chalk.bold.red("Action")} exception (${interaction.commandName}): \n`,
					e,
					` ${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })}`,
				);
			});
		}

		if (interaction.isChatInputCommand()) {
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
