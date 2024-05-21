import { ChannelType, Events } from "discord.js";
import { CallsystemStd, predicate } from "../lib/callsystems/index.js";

const callTextChannel = async ({ client, message }) => {
	const callsystem = client.callsystemsMap.get("cs.spongedsc.legacy-2.0.1");
	if (!callsystem || !predicate(callsystem)) return;
	if (!CallsystemStd.conditions(message, process.env)) return;

	const callsystemInstance = new callsystem({ env: process.env, message, client });
	await callsystemInstance.activate();
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
