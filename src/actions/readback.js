// Readback: Read the direct context of what was said in the message
import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { v4 } from "uuid";

/** @type {import('./index.js').Action} */
export default {
	data: new ContextMenuCommandBuilder().setName("Direct context window").setType(ApplicationCommandType.Message),
	async execute(interaction) {
		const client = interaction.client;
		await interaction.deferReply({ ephemeral: true });
		const history = (
			await client.kv
				.lRange(interaction?.channel?.id, 0, -1)
				.then((r) => r.map((m) => JSON.parse(m)))
				.catch(() => [])
		).reverse();

		const targetEntries = history.filter((e) => e.context?.respondingTo === interaction?.targetMessage?.id);
		const targetReferenceEntries = history.filter(
			(e) => e.context?.respondingTo === interaction?.targetMessage?.reference?.messageId,
		);

		const entries = [...targetEntries, ...targetReferenceEntries];

		if (entries?.length === 0)
			return await interaction.editReply({
				content: "No context was found for this message. Maybe the history was cleared?",
			});

		const entryMessages = entries?.map((entry) => entry?.content)?.join("\n\n==========\n\n");

		try {
			const randFileName = v4().split("-").join();
			if (!existsSync(path.resolve("./temp/"))) mkdirSync(path.resolve("./temp/"));
			writeFileSync(path.resolve(`./temp/${randFileName}.md`), entryMessages);

			await interaction?.editReply({
				content: "",
				files: [`./temp/${randFileName}.md`],
				failIfNotExists: true,
			});

			unlinkSync(path.resolve(`./temp/${randFileName}.md`));
		} catch (e) {
			console.error(e);
			await interaction.editReply({ content: "An error occurred whilst sending the context." });
		}

		return await interaction.editReply({ content: "woohoo!" });
	},
};
