/** @type {import('./index.js').Command} */
export default {
	data: {
		name: "forget",
		description: "Forget the conversation history in the current channel.",
	},
	async execute(interaction) {
		await interaction.deferReply();
		const client = interaction.client;

		const current = (await client.kv.lRange(interaction?.channel?.id, 0, -1)).reverse();
		const cardinalRules = new Intl.PluralRules("en-GB");

		const noun = cardinalRules.select(current?.length) === "one" ? "memory" : "memories";

		const operation = await client.kv
			.del(interaction?.channel.id)
			.then(() => true)
			.catch(() => false);

		if (!operation) return interaction.editReply({ content: `✖️ Failed to clear ${current?.length || 0} ${noun}.` });
		return interaction.editReply({ content: `✔️ Cleared ${current?.length || 0} ${noun}.` });
	},
};
