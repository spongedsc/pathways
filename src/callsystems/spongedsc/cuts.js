import { Callsystem } from "../../lib/callsystems/index.js";
 
 
	 

const getResult = async ({ messageId, channel, reply, client, env }, tests) =>
	await Promise.all(
		tests.map(async ({ id, test }) => {
			const m = await channel.messages.fetch(messageId).catch(() => {});

			if (!test?.packageId?.startsWith("cs.tests") && tests.length === 1) {
				m.reply(`Test ${id} is not a CUTS unit test.`).catch(() => {});
				return {
					embeds: [],
					results: [],
				};
			}

			m.content = m.content + "\ncuts.run";

			const testClass = new test({ env, message: m, client });
			return await testClass.activate().catch((e) => {
				console.error(e);
				return [];
			});
		}),
	);

export default class HistoryConsoleUnitTest extends Callsystem {
	constructor(opts) {
		const { env, message, client, defaultModel, defaultProvider } = opts || {};
		super({ env, message, client, defaultModel, defaultProvider });
	}

	static get packageId() {
		return "cs.spongedsc.cuts-runner";
	}

	static get name() {
		return "CUTS Runner";
	}

	static get version() {
		return "0.0.1";
	}

	static get releaseDate() {
		return new Date("2024-05-28");
	}

	static get capabilities() {
		return ["legacy"];
	}

	static get managerOptions() {
		return {};
	}

	async activate() {
		const { env, message, client } = this;

		if (!message?.mentions?.has(client?.user?.id)) return [];
		if (message.content.split(" ")[1] !== "cuts.run") return [];
		const args = message.content.split(" ").slice(2);
		const testId = args[0];
		if (!testId) {
			message.reply("Please provide a test ID.").catch(() => {});
			return [];
		}

		const tests =
			testId === "all"
				? Array.from(client.callsystemsMap.keys())
						.map((c) => ({
							id: c,
							test: client.callsystemsMap.get(c),
						}))
						.filter((t) => t.id.startsWith("cs.tests") && !t.id.includes("non-cuts") && t.id.endsWith("-latest"))
				: [
						{
							id: testId,
							test: client.callsystemsMap.get(testId + "-latest"),
						},
					];

		const results = await getResult(
			{ messageId: message.id, channel: message.channel, reply: message.reply, client, env },
			tests.filter((t) => t !== null),
		);

		return results;
	}
}
