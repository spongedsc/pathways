import { ModelInteractions } from "../util/models/index.js";
import { fetch } from "undici";
import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";

/** @type {import('./index.js').Command} */
export default {
	data: {
		name: "forget",
		description: "Forget the conversation history in the current channel.",
	},
	async execute(interaction) {
		await interaction.deferReply();
		const client = interaction.client;

		const modelInteractions = new ModelInteractions({
			kv: client.kv,
			instructionSet: client.tempStore.get("instructionSet") || process.env.MODEL_LLM_PRESET || "default",
			baseHistory: [],
			model: "@cf/meta/llama-3-8b-instruct",
		});

		const { log, length } = await modelInteractions.history
			.formatLog({
				key: interaction?.channel?.id,
			})
			.then((returns) => ({
				...returns,
				log: Buffer.from(returns?.log),
			}));

		const cardinalRules = new Intl.PluralRules("en-GB");

		const noun = cardinalRules.select(length) === "one" ? "memory" : "memories";

		const operation = await client.kv
			.del(interaction?.channel.id)
			.then(() => true)
			.catch(() => false);

		if (!operation) return await interaction.editReply({ content: `✖️ Failed to clear ${length || 0} ${noun}.` });

		const toSay = `✔️ Cleared ${length || 0} ${noun}.`;

		if (length === 0) return await interaction.editReply({ content: toSay });

		try {
			const request = await fetch(
				`${process.env.MEMVIEW_HOST}/create`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${process.env.MEMVIEW_KEY}`,
					},
					body: JSON.stringify({
						content: log.toString("utf-8"),
					}),
				},
			).catch((e) => {
				console.error("Error uploading logs to memory viewer: " + e);
				return false;
			});

			const button = new ButtonBuilder()
				.setLabel('View cleared memories')
				.setURL(request !== false ? `${process.env.MEMVIEW_HOST}/${(await request.json()).id}` : 'https://blahaj.ca/')
				.setStyle(ButtonStyle.Link);

			await interaction?.editReply({
				content: `${toSay}`,
				failIfNotExists: true,
				components: request !== false ? [new ActionRowBuilder().addComponents(button)] : [],
			});

			return;
		} catch (e) {
			console.error(e);
			return interaction.editReply({ content: toSay });
		}
	},
};
