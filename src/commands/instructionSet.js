import { SlashCommandBuilder } from "discord.js";
import chalk from "chalk";
import { instructionSets } from "../util/models/constants.js";

/** @type {import('./index.js').Command} */
export default {
	data: new SlashCommandBuilder()
		.setName("instructionset")
		.setDescription("Specify an instruction set for the chatbot to use.")
		.addStringOption((o) =>
			o
				.setName("preset")
				.setDescription("Preset; map to => client.tempStore#instructionSet")
				.setChoices(Object.keys(instructionSets).map((s) => ({ name: instructionSets[s]?.name || s, value: s })))
				.setRequired(true),
		)
		.toJSON(),
	async execute(interaction) {
		await interaction.deferReply();
		const toOption = interaction.options.getString("preset");
		interaction.client.tempStore.set("instructionSet", toOption);

		const sync = await interaction.client.kv
			.set("instructionSet", toOption)
			.then(() => true)
			.catch(() => false);

		await interaction.client.kv
			.del(interaction?.channel.id)
			.then(() => true)
			.catch(() => false);

		await interaction.editReply({
			content: `**${toOption}** is now the current instruction set.`,
		});

		console.log(
			`${chalk.bold.green("AI")} Instruction set preset changed to ${chalk.bold(instructionSets[toOption]?.name || toOption)} (${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })})`,
		);

		if (sync) {
			const reply = await interaction.fetchReply().catch(() => ({
				react: () => null,
			}));

			await reply.react(`🌨️`);
		}
	},
};
