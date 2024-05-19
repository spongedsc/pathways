import { ModelInteractions } from "../util/models/index.js";

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
			await interaction?.editReply({
				content: toSay,
				files: [
					{
						attachment: log,
						name: "context.md",
					},
				],
				failIfNotExists: true,
			});

			return;
		} catch (e) {
			console.error(e);
			return interaction.editReply({ content: toSay });
		}
	},
};
