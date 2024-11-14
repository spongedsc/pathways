import { SlashCommandBuilder } from "discord.js";
import { WorkersAI } from "../util/models/index.js";

/** @type {import('./index.js').Command} */
export default {
	data: new SlashCommandBuilder()
		.setName("imagine")
		.setDescription("Generate an image.")
		.addStringOption((o) =>
			o
				.setName("model")
				.setDescription("Enter a description of what you're generating.")
				.setChoices([
					{
						name: "lykon/dreamshaper-8-lcm",
						value: "@cf/lykon/dreamshaper-8-lcm",
					},
					{
						name: "bytedance/stable-diffusion-xl-lightning",
						value: "@cf/bytedance/stable-diffusion-xl-lightning",
					},
					{
						name: "stabilityai/stable-diffusion-xl-base-1.0",
						value: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
					},
					{
						name: "black-forest-labs/flux-1-schnell",
						value: "@cf/black-forest-labs/flux-1-schnell",
					},
				])
				.setRequired(true),
		)
		.addStringOption((o) =>
			o.setName("prompt").setDescription("Enter a description of what you're generating.").setRequired(true),
		)
		.toJSON(),
	async execute(interaction) {
		const workersAI = new WorkersAI({
			accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
			token: process.env.CLOUDFLARE_ACCOUNT_TOKEN,
		});

		await interaction.deferReply();
		const prompt = interaction.options.getString("prompt");
		const model = interaction.options.getString("model");

		const callToModel = await (async () => {
			const prefix = model?.split("/")?.[0];
			if (prefix !== "@cf") return;

			return await workersAI
				.callModel(
					{
						model,
						input: {
							prompt,
						},
					},
					true,
				)
				.then((r) => r.arrayBuffer())
				.catch(() => (e) => {
					console.error(e);
					return null;
				});
		})();

		if (callToModel === null)
			return await interaction.editReply({
				content: `The model did not generate an image.`,
			});

		let buffer = null;

		try {
			const textDecoder = new TextDecoder();
			const text = textDecoder.decode(callToModel);
			const jsonResponse = JSON.parse(text);

			if (jsonResponse?.success === false) {
				if (jsonResponse?.errors?.find((e) => e?.code === 3030)) {
					return await interaction.editReply({
						content: `❌ The model rejected your prompt because it contained a disallowed token (NSFW content). Please try again with a different prompt.`,
					});
				} else {
					return await interaction.editReply({
						content: `The model could not generate an image. Attached is a log of the error.`,
						files: [
							{
								attachment: Buffer.from(callToModel, "utf-8"),
								name: "error.txt",
							},
						],
					});
				}
			}

			if (jsonResponse?.result?.image) {
				buffer = Buffer.from(jsonResponse.result.image, "base64");
			} else {
				buffer = Buffer.from(callToModel);
			}
		} catch (e) {
			buffer = Buffer.from(callToModel);
		}

		if (buffer === null) buffer = Buffer.from(callToModel);

		await interaction.editReply({
			content: `\`${prompt}\`\n*generated with \`${model}\`*`,
			files: [
				{
					attachment: buffer,
					name: "image0.jpg",
				},
			],
		});
	},
};
