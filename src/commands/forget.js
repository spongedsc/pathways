import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { v4 } from "uuid";

/** @type {import('./index.js').Command} */
export default {
	data: {
		name: "forget",
		description: "Forget the conversation history in the current channel.",
	},
	async execute(interaction) {
		await interaction.deferReply();
		const client = interaction.client;

		const current = (
			await client.kv
				.lRange(interaction?.channel?.id, 0, -1)
				.then((r) => r.map((m) => JSON.parse(m)))
				.catch(() => [])
		).reverse();
		const messages = current?.map((entry) => entry?.content)?.join("\n\n==========\n\n");
		const cardinalRules = new Intl.PluralRules("en-GB");

		const noun = cardinalRules.select(current?.length) === "one" ? "memory" : "memories";

		const operation = await client.kv
			.del(interaction?.channel.id)
			.then(() => true)
			.catch(() => false);

		if (!operation)
			return await interaction.editReply({ content: `✖️ Failed to clear ${current?.length || 0} ${noun}.` });

		const toSay = `✔️ Cleared ${current?.length || 0} ${noun}.`;

		if (current?.length === 0) return await interaction.editReply({ content: toSay });

		try {
			const randFileName = v4().split("-").join();
			if (!existsSync(path.resolve("./temp/"))) mkdirSync(path.resolve("./temp/"));
			writeFileSync(path.resolve(`./temp/${randFileName}.md`), messages);

			await interaction?.editReply({
				content: toSay,
				files: [`./temp/${randFileName}.md`],
				failIfNotExists: true,
			});

			unlinkSync(path.resolve(`./temp/${randFileName}.md`));

			return;
		} catch (e) {
			console.error(e);
			return interaction.editReply({ content: toSay });
		}
	},
};
