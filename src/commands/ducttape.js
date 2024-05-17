import { SlashCommandBuilder } from "discord.js";

/** @type {import('./index.js').Command} */
export default {
	data: new SlashCommandBuilder()
		.setName("ducttape")
		.setDescription("STFU! Enable/disable passive response features until next restart.")
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
			content: `**${toOption ? "Enabled" : "Disabled"}** silent mode. ${!toOption ? "" : "Passive response features are now disabled until the bot restarts, or until silent mode is disabled. (Pinging the bot will always result in a response.)"}`,
		});

		if (sync) {
			const reply = await interaction.fetchReply().catch(() => ({
				react: () => null,
			}));

			await reply.react(`🌨️`);
		}
	},
};
