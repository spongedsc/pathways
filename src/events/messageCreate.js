import { ChannelType, Events, ThreadAutoArchiveDuration } from 'discord.js';
// import { Environment } from '../util/helpers.js';

// const env = new Environment();

const callTextChannel = async ({ client, message }) => {
	if (!message?.mentions.has(client.user?.id)) return;

	/*const thread = await message.startThread({
		name: `${new Date().toISOString()}`,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
		reason: `Requested by ${message.author.id}`,
	});

	await thread.members.add(message.author.id);

	thread.send('It works?');
    */
};

const callThreadChannel = async ({ client, message }) => {
	const channel = message.channel;
	message.reply('herro').catch(() => null);
};

/** @type {import('./index.js').Event<Events.MessageCreate>} */
export default {
	name: Events.MessageCreate,
	// once: false,
	async execute(message) {
		const client = message.client;
		if (message.member.id === client.user.id) return;
		if (message.channel.type === ChannelType.GuildText) {
			void callTextChannel({ client, message });
		}

		if (message.channel.type === ChannelType.PublicThread) {
			// void callThreadChannel({ client, message });
		}
	},
};
