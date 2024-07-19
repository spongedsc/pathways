import { SlashCommandBuilder } from "discord.js";
import chalk from "chalk";

/** @type {import('./index.js').Command} */
export default {
	data: new SlashCommandBuilder()
		.setName("sleep")
		.setDescription(
			"Night night, time to sleep! Enable/disable passive response features until the the bot is woken up.",
		)
		.addBooleanOption((o) =>
			o.setName("enabled").setDescription("Map to => client.tempStore#silentMode").setRequired(true),
		)
		.toJSON(),
	async execute(interaction) {
		await interaction.deferReply();
		const toOption = interaction.options.getBoolean("enabled");
		interaction.client.tempStore.set("silentMode", toOption);
		const sync = await interaction.client.kv
			.set("silentMode", toOption ? "true" : "false")
			.then(() => true)
			.catch(() => false);

		await interaction.editReply({
			content: `**${toOption ? "Enabled" : "Disabled"}** silent mode. ${!toOption ? "" : "Passive response features are now disabled until the k/V is wiped, or until silent mode is disabled. (Pinging the bot will always wake it up again.)"}`,
		});

		console.log(
			`${chalk.bold.green("AI")} Silent mode was ${chalk.bold(toOption ? "enabled" : "disabled")} (${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })})`,
		);

		if (sync) {
			const reply = await interaction.fetchReply().catch(() => ({
				react: () => null,
			}));

			await reply.react(`🌨️`);
		}
	},
};
