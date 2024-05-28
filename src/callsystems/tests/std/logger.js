import chalk from "chalk";
import { Callsystem } from "../../../lib/callsystems/index.js";
import dedent from "dedent";

export default class HistoryConsoleUnitTest extends Callsystem {
	constructor(opts) {
		const { env, message, client, defaultModel, defaultProvider } = opts || {};
		super({ env, message, client, defaultModel, defaultProvider });
	}

	static get packageId() {
		return "cs.tests.console.stdlib.logger";
	}

	static get name() {
		return "UT/stdlib: Logger";
	}

	static get version() {
		return "0.0.1";
	}

	static get releaseDate() {
		return new Date("2024-05-27");
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
				id: "log",
				name: "Log",
				runTest: async () => this.std.log({ message: "Hello world!", level: "error", mock: true }),
				expects: (result) =>
					`${chalk.bold.red("ERROR")} ${chalk.bold.cyan("CS/UT/stdlib: Logger")} Hello world!` === result,
			},
			{
				id: "info",
				name: "Info",
				runTest: async () => this.std.log({ message: "Hello world!", level: "info", mock: true }),
				expects: (result) =>
					`${chalk.bold.blue("INFO")} ${chalk.bold.cyan("CS/UT/stdlib: Logger")} Hello world!` === result,
			},
			{
				id: "warn",
				name: "Warn",
				runTest: async () => this.std.log({ message: "Hello world!", level: "warn", mock: true }),
				expects: (result) =>
					`${chalk.bold.yellow("WARN")} ${chalk.bold.cyan("CS/UT/stdlib: Logger")} Hello world!` === result,
			},
			{
				id: "error",
				name: "Error",
				runTest: async () => this.std.log({ message: "Hello world!", level: "error", mock: true }),
				expects: (result) =>
					`${chalk.bold.red("ERROR")} ${chalk.bold.cyan("CS/UT/stdlib: Logger")} Hello world!` === result,
			},
		]);

		const { embed: resultsEmbed, results } = await uts.executeWithEmbed();

		await message.reply({ embeds: [resultsEmbed] });

		return results;
	}
}
