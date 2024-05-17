import { Events } from "discord.js";
import { Environment } from "../util/helpers.js";
import { createClient } from "redis";
import chalk from "chalk";

const env = new Environment();

/** @type {import('./index.js').Event<Events.ClientReady>} */
export default {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		const kv = createClient({
			url: process.env.KV_URI,
		});

		await kv
			.on("error", (e) =>
				console.log(
					`${chalk.bold.red("KV")} exception: `,
					e,
					` ${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })}`,
				),
			)
			.on("ready", () =>
				console.log(
					`${chalk.bold.blue("KV")} connected (${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })})`,
				),
			)
			.connect();

		client.kv = kv;
		client.tempStore = new Map();

		const silentSaved = await client.kv
			.get("silentMode")
			.then((s) => (s == "true" ? true : false))
			.then(() => false);

		client.tempStore.set("silentMode", silentSaved);

		console.log(`${chalk.bold.green("AI")} Silent mode is ${chalk.bold(silentSaved ? "enabled" : "disabled")}`);

		console.log(
			`${chalk.bold.green("Core")} acting as ${chalk.bold(client.user.tag)} (${Temporal.Now.instant().toLocaleString("en-GB", { timeZone: "Etc/UTC", timeZoneName: "short" })})`,
		);
	},
};
