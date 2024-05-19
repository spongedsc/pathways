import { ChannelType, Events } from "discord.js";
import { ModelInteractions } from "../util/models/index.js";

const callTextChannel = async ({ client, message }) => {
	const modelInteractions = new ModelInteractions({
		message,
		kv: client.kv,
		instructionSet: client.tempStore.get("instructionSet") || process.env.MODEL_LLM_PRESET || "default",
		baseHistory: [],
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
		token: process.env.CLOUDFLARE_ACCOUNT_TOKEN,
		model: "@cf/meta/llama-3-8b-instruct",
	});

	const preliminaryConditions = modelInteractions.messageEvent.checkPreliminaryConditions();
	if (!preliminaryConditions) return;

	const formattedMessage = await modelInteractions.response.formatUserMessage();
	const validityCheck = await modelInteractions.messageEvent.validateHistory();

	if (!validityCheck.valid) {
		if (validityCheck?.handled?.isRequired && !validityCheck?.handled?.executed)
			return await message.react("⚠️").catch(() => {
				console.log("Failed to delete key from KV after valid history check failed");
				console.error(e);
				return false;
			});
	}

	const history = await modelInteractions.history
		.add({
			key: message?.channel?.id,
			role: "user",
			content:
				formattedMessage +
				(validityCheck?.valid
					? ""
					: "\n\nAlso, you had a system error and your memory was cleared. Explain that to me."),
			respondingTo: message?.id,
		})
		.catch(console.error);

	const { textResponse, genData, callResponse } = await modelInteractions.messageEvent.handleTextModelCall({ history });

	if (callResponse.length === 0 || callResponse === "") return await message.react("⚠️").catch(() => false);

	const { responseMsg, events } = await modelInteractions.messageEvent.createResponse({
		textResponse,
		conditions: {
			amnesia: !validityCheck?.valid && validityCheck?.handled?.isRequired && validityCheck?.handled?.executed,
			imagine: callResponse.includes("!gen"),
		},
	});

	if (responseMsg && callResponse.includes("!gen"))
		return await modelInteractions.messageEvent.handleImageModelCall({ genData, textResponse, responseMsg, events });
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
