import { Logger } from "../../../logger.js";
import { EmbedBuilder } from "discord.js";
import dedent from "dedent";
import chalk from "chalk";

export class CallsystemUnitTestSuite {
	constructor({ packageId, name, tests = [], loggerOptions }) {
		this.packageId = packageId;
		this.name = name;
		this._tests = tests;
		this.loggerOptions = loggerOptions;
		this._logger = new Logger(loggerOptions);
	}

	get tests() {
		return this._tests;
	}

	get logger() {
		return this._logger;
	}

	/**
     * @example
     cuts.addTests([
        {
            id: "default",
            name: "Default Test",
            runTest: async () => {
                return "Test 1 result";
            },
            expects: "Test 1 result",
        },
     ])
     */
	addTests(tests) {
		this._tests = [...(this._tests || []), ...tests];
		return this;
	}

	async handlePreflightChecks({ message, client }) {
		if (!message?.mentions?.has(client?.user?.id)) return false;

		if (!message.content.endsWith("cuts.run")) {
			await message
				.reply(
					dedent`
            The current Pathways instance has a test callsystem configured. Contact an administrator for further assistance.\n
            (Ping me with a message ending in \`cuts.run\` to run unit tests with CUTS.)
            `,
				)
				.catch(() => {});
			return false;
		}

		return true;
	}

	async execute() {
		return await Promise.all(
			this.tests.map(async (test) => {
				const result = await test.runTest();
				if (result !== test.expects) {
					this.logger.error(`❌  Failed test ${chalk.bold(test.id)}`, { module: "callsystem" });
					return {
						success: false,
						name: test.name,
						id: test.id,
						result: result,
					};
				} else {
					this.logger.info(`✅  Passed test ${chalk.bold(test.id)}`, { module: "callsystem" });
					return {
						success: true,
						name: test.name,
						id: test.id,
						result: result,
					};
				}
			}),
		);
	}

	async executeWithEmbed() {
		const results = await this.execute();

		const failed = results.filter((result) => result.success === false);
		const passed = results.filter((result) => result.success === true);

		const resultsEmbed = new EmbedBuilder()
			.setTimestamp()
			.setColor(0x00ff00)
			.setTitle(`CUTS Results: ${this.packageId}`).setDescription(dedent`
        # ${this.name}
        This is a test of the logger utilities in CallsystemsStd.
        ## Results
        - Passing: **${passed.length}/${results.length}**
        - Failing: **${failed.length}/${results.length}**
    `);

		resultsEmbed.addFields(
			results.map((result) => {
				return {
					name: result.name,
					value: result.success ? `✅` : `❌`,
					inline: true,
				};
			}),
		);

		return {
			results: results || [],
			embed: resultsEmbed || new EmbedBuilder(),
		};
	}
}
