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
				enabled: true,
				id: "add",
				name: "Add a singular record",
				runTest: async () => {
					// Remove all records
					await this.std.history.removeAll(message?.channel?.id);

					// Add a single dummy record
					const results = await this.std.history.add(
						message?.channel?.id,
						{
							role: "user",
							content: "test",
							contextId: message?.id,
						},
						false, // Don't return all records
						false, // Don't return the base history
					);

					return results;
				},
				expects: (r) => {
					// The record should have the correct contextId, role, and content
					const foundResult = r
						.map((r) => ({
							contextId: r.contextId,
							role: r.role,
							content: r.content,
						}))
						.find((r) => r.contextId === message?.id && r.role === "user" && r.content === "Bees! Dots!: test");

					// There should be 1 record in the history
					return foundResult !== undefined && r.length === 1;
				},
			},
			{
				enabled: true,
				id: "addMany",
				name: "Add multiple records",
				runTest: async () => {
					// Remove all records
					await this.std.history.removeAll(message?.channel?.id);

					// Add multiple dummy records
					const results = await this.std.history.addMany(
						message?.channel?.id,
						[
							{ role: "user", content: "test", contextId: message?.id },
							{ role: "user", content: "test 2", contextId: message?.id },
							{ role: "user", content: "test 3", contextId: message?.id },
							{ role: "user", content: "test 4", contextId: message?.id },
							{ role: "user", content: "test 5", contextId: message?.id },
							{ role: "user", content: "test 6", contextId: message?.id },
						],
						false, // Don't return all records
						false, // Don't return the base history
					);

					return results;
				},
				expects: (r) => {
					// The base history should be empty
					const foundResult = r.find((r) => r.base === true);

					// There should be 6 records in the history
					return foundResult === undefined && r.length === 6;
				},
			},
			{
				enabled: true,
				id: "remove",
				name: "Remove a record",
				runTest: async () => {
					// Remove all records
					await this.std.history.removeAll(message?.channel?.id);

					// Add a single dummy record
					await this.std.history.add(
						message?.channel?.id,
						{
							role: "user",
							content: "test",
							contextId: message?.id,
						},
						false, // Don't return all records
						false, // Don't return the base history
					);

					// Remove the record
					const removed = await this.std.history.remove(message?.channel?.id, message?.id, ["user"]);

					// There should be 0 records in the history
					return removed;
				},
				expects: (r) => {
					// There should be no records in the history
					return r.length === 0;
				},
			},
			{
				enabled: true,
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
		]);

		const { embed: resultsEmbed, results } = await uts.executeWithEmbed();

		await message.reply({ embeds: [resultsEmbed] });

		return results;
	}
}
