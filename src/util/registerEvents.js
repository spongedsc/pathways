import { Events } from "discord.js";
import chalk from "chalk";

/**
 * @param {Map<string, import('../commands/index.js').Command>} commands
 * @param {import('../events/index.js').Event[]} events
 * @param {import('discord.js').Client} client
 */
export function registerEvents(commands, events, client) {
	// Create an event to handle command interactions
	/** @type {import('../events/index.js').Event<Events.InteractionCreate>} */
	const interactionCreateEvent = {
		name: Events.InteractionCreate,
		async execute(interaction) {
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

	for (const event of [...events, interactionCreateEvent]) {
		client[event.once ? "once" : "on"](event.name, async (...args) => {
			try {
				return event.execute(...args);
			} catch (e) {
				console.log(
					`${chalk.bold.red("Event")} exception (${event?.name}): \n`,
					e,
					` ${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })}`,
				);
			}
		});
	}
}
