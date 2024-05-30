import { ChannelType, Events } from "discord.js";
import { CallsystemStd, predicate } from "../lib/callsystems/index.js";

const callTextChannel = async ({ client, message }) => {
	const callsystem = client.callsystemsMap.get(client.tempStore.get("callsystem") || "cs.spongedsc.legacy-latest");
	if (!callsystem || !predicate(callsystem)) {
		await message
			.reply("**⚠️ No callsystem was found. Please contact an administrator for further assistance.**")
			.catch(() => {
				console.log("Failed to send callsystem error to user");
				console.error(e);
				return false;
			});
		return {
			success: false,
			message: "No callsystem found.",
			context: {},
		};
	}
	if (!CallsystemStd.conditions(message, process.env)) return;

	const callsystemInstance = new callsystem({ env: process.env, message, client });
	const activationResponse = await callsystemInstance.activate();
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
