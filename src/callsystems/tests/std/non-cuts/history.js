import { Callsystem } from "../../../../lib/callsystems/index.js";

export default class HistoryConsoleUnitTest extends Callsystem {
	constructor(opts) {
		const { env, message, client, defaultModel, defaultProvider } = opts || {};
		super({ env, message, client, defaultModel, defaultProvider });
	}

	static get packageId() {
		return "cs.tests.console.stdlib.history";
	}

	static get name() {
		return "UT/stdlib: History";
	}

	static get version() {
		return "0.0.1";
	}

	static get releaseDate() {
		return new Date("2024-05-26");
	}

	static get capabilities() {
		return ["legacy"];
	}

	static get managerOptions() {
		return {
			recordTemplate: "%B% {D}: %RESPONSE%",
			variables: {
				"%B%": "Bees!",
				"{D}": "Dots!",
			},
		};
	}

	async activate() {
		const { message, client, env } = this;

		console.log("Remove all");
		await this.std.history.removeAll(message?.channel?.id);

		console.log("Push one");
		console.log(
			await this.std.history.add(message?.channel?.id, { role: "user", content: "test", contextId: message?.id }),
		);
		console.log("Push many");
		console.log(
			await this.std.history.addMany(message?.channel?.id, [
				{ role: "user", content: "test 2", contextId: message?.id },
				{ role: "user", content: "test 3", contextId: message?.id },
				{ role: "user", content: "test 4", contextId: message?.id },
				{ role: "user", content: "test 5", contextId: message?.id },
				{ role: "user", content: "test 6", contextId: message?.id },
			]),
		);
		console.log("Push one");
		console.log(
			await this.std.history.add(message?.channel?.id, { role: "user", content: "test", contextId: message?.id }),
		);
		console.log("Push many");
		console.log(
			await this.std.history.addMany(message?.channel?.id, [
				{ role: "user", content: "test 2", contextId: message?.id },
				{ role: "user", content: "test 3", contextId: message?.id },
				{ role: "user", content: "test 4", contextId: message?.id },
				{ role: "user", content: "test 5", contextId: message?.id },
				{ role: "user", content: "test 6", contextId: message?.id },
			]),
		);
		console.log("History");
		console.log(await this.std.history.everything(message?.channel?.id));
	}
}
