import chalk from "chalk";

/**
 * @param {Map<string, import('../commands/index.js').Command>} commands
 * @param {import('../events/index.js').Event[]} events
 * @param {import('discord.js').Client} client
 */
export function registerEvents(commands, events, client) {
	// Move the command map to the client context.
	// Necessary change to move interactionCreate into its' own file.
	client.commands = commands;

	for (const event of [...events]) {
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
