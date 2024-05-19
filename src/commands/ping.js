import { EmbedBuilder } from "discord.js";
import { Duration } from "luxon";

/** @type {import('./index.js').Command} */
export default {
	data: {
		name: "ping",
		description: "Ping!",
	},
	async execute(interaction) {
		const apiStart = Temporal.Instant.fromEpochMilliseconds(interaction.createdTimestamp);
		const apiEnd = Temporal.Now.instant();
		await interaction.deferReply({ ephemeral: true });

		const apiDiff = apiEnd.since(apiStart).milliseconds + "ms";
		const uptime = Duration.fromISO(
			Temporal.Duration.from({ seconds: Math.floor(process.uptime()) }).toString(),
		).toHuman({ unitDisplay: "narrow" });

		const content =
			` 🌐 **Round-Trip Latency** \`${apiDiff}\`` +
			"\n" +
			` 🛜 **Socket Latency** \`${interaction.client.ws.ping}ms\`` +
			"\n" +
			` ⌚ **Uptime** \`${uptime}\`` +
			"\n";

		const SendEmbed = new EmbedBuilder()
			.setTitle("Current statistics")
			.setColor("Random")
			.setDescription(content)
			.setTimestamp();

		return await interaction.editReply({ embeds: [SendEmbed] });
	},
};
