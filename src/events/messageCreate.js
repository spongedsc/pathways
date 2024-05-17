import { ChannelType, Events } from "discord.js";
import { ModelInteractions } from "../util/models/index.js";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { v4 } from "uuid";
import path from "node:path";

const callTextChannel = async ({ client, message }) => {
	const channelSetlist = process.env.ACTIVATION_CHANNEL_SETLIST.split(",");
	const channelSatisfies = channelSetlist?.includes(message?.channel?.id);
	if (process.env.ACTIVATION_MODE === "WHITELIST" && !channelSatisfies) return;
	if (process.env.ACTIVATION_MODE === "BLACKLIST" && channelSatisfies) return;

	if (message?.content?.startsWith("!!")) return;
	if (client.tempStore.get("silentMode") === true && !message?.mentions?.has(client?.user?.id)) return;

	const modelInteractions = new ModelInteractions({
		message,
		kv: client.kv,
		instructionSet: client.tempStore.get("instructionSet") || process.env.MODEL_LLM_PRESET || "default",
		baseHistory: [],
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
		token: process.env.CLOUDFLARE_ACCOUNT_TOKEN,
	});

	const formattedMessage = await modelInteractions.response.formatMessage();

	const history = await modelInteractions.history
		.add({
			key: message?.channel?.id,
			role: "user",
			content: formattedMessage,
		})
		.catch(console.error);

	await message.channel.sendTyping();

	const modelCall = await modelInteractions.response.workersAI
		.callModel({
			model: "@cf/meta/llama-3-8b-instruct",
			input: {
				messages: history,
			},
			maxTokens: 512,
		})
		.catch(() => ({
			result: { response: null },
		}));

	const callResponse = modelCall?.result?.response?.trim();
	if (callResponse.length === 0 || callResponse === "") {
		await modelInteractions.history
			.add(
				{
					key: message?.channel?.id,
					role: "assistant",
					content: "[no response]",
				},
				true,
			)
			.catch(console.error);
		return await message.react("⚠️").catch(() => false);
	} else {
		await modelInteractions.history
			.add(
				{
					key: message?.channel?.id,
					role: "assistant",
					content: callResponse,
				},
				true,
			)
			.catch(console.error);
	}

	const textResponse = callResponse?.split("!gen")?.[0];
	const genData = callResponse?.split("!gen")?.[1]?.replace("[", "").replace("]", "");

	if (textResponse?.length >= 2000) {
		try {
			const randFileName = v4().split("-").join();
			if (!existsSync(path.resolve("./temp/"))) mkdirSync(path.resolve("./temp/"));
			writeFileSync(path.resolve(`./temp/${randFileName}.md`), textResponse);

			await message
				?.reply({
					content: "",
					files: [`./temp/${randFileName}.md`],
					failIfNotExists: true,
				})
				.catch(() => message.react("❌").catch(() => false));

			unlinkSync(path.resolve(`./temp/${randFileName}.md`));
		} catch (e) {
			await message.react("❌").catch(() => false);
		}
	} else {
		const responseMsg = await message
			?.reply({
				content: callResponse.includes("!gen") ? `${textResponse}\n\n__Generating an image..__` : textResponse,
				failIfNotExists: true,
			})
			.catch(() => message.react("❌").catch(() => false));
		if (responseMsg !== false && callResponse.includes("!gen")) {
			await message.channel.sendTyping();
			const imageGen = await modelInteractions.response.generateImage({ data: genData }).catch((e) => {
				console.error(e);
				return null;
			});
			if (imageGen === null) return await responseMsg.edit({ content: textResponse }).catch(() => null);

			responseMsg
				.edit({
					content: textResponse,
					files: [imageGen],
				})
				.catch(() => null);
		}
	}
};

/** @type {import('./index.js').Event<Events.MessageCreate>} */
export default {
	name: Events.MessageCreate,
	// once: false,
	async execute(message) {
		const client = message.client;
		if (message.author.bot) return;
		if (message.author?.id === client.user.id) return;
		if (message?.channel === null) return;
		if (message.channel.type === ChannelType.GuildText) {
			void callTextChannel({ client, message });
		}
	},
};
