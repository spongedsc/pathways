import { Callsystem } from "../../../lib/callsystems/index.js";

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
		const { message, client } = this;

		if (!(await this.std.cuts.handlePreflightChecks({ message, client }))) return;

		const uts = this.std.cuts.addTests([
			{
				id: "removeAll",
				name: "Remove all records",
				runTest: async () => {
					// Add dummy records
					await this.std.history.addMany(message?.channel?.id, [
						{ role: "user", content: "test", contextId: message?.id },
						{ role: "user", content: "test 2", contextId: message?.id },
						{ role: "user", content: "test 3", contextId: message?.id },
						{ role: "user", content: "test 4", contextId: message?.id },
						{ role: "user", content: "test 5", contextId: message?.id },
						{ role: "user", content: "test 6", contextId: message?.id },
					]);

					const results = await this.std.history.removeAll(message?.channel?.id);
					return results.length;
				},
				expects: (r) => r === 0,
			},
			{
				id: "add",
				name: "Add a record",
				runTest: async () => {
					// Remove all records
					await this.std.history.removeAll(message?.channel?.id);

					const results = await this.std.history.add(
						message?.channel?.id,
						{
							role: "user",
							content: "test",
							contextId: message?.id,
						},
						false,
						false,
					);

					const foundResult = results
						.map((r) => ({
							contextId: r.contextId,
							role: r.role,
							content: r.content,
						}))
						.find((r) => r.contextId === message?.id && r.role === "user" && r.content === "Bees! Dots!: test");

					console.log(results);

					return foundResult !== undefined && results.length === 1;
				},
				expects: (r) => r === true,
			},
		]);

		const { embed: resultsEmbed, results } = await uts.executeWithEmbed();

		await message.reply({ embeds: [resultsEmbed] });

		return results;
		/*
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
        */
	}
}
