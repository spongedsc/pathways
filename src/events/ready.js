import { Events } from 'discord.js';
import { Environment } from '../util/helpers.js';
import { createClient } from 'redis';

const env = new Environment();

/** @type {import('./index.js').Event<Events.ClientReady>} */
export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		if (env.getRuntimeScenario() === 'development') console.log('! Running in development');

		const kv = await createClient({
			url: process.env.KV_URI,
		})
			.on('error', (e) => console.log(`KV Client Error: `, e))
			.on('ready', () => console.log(`KV Client: connected`))
			.connect();
		client.kv = kv;

		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
