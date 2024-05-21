import { Plugin } from "release-it";
import { WorkersAI } from "../../src/util/models/index.js";
class PathwaysReleaseItPlugin extends Plugin {
	static disablePlugin(options) { }

	async beforeBump() {
		const { accountId, token, defaultModel, releaseNotes } = this.getContext();
		if (!accountId || !token) {
			this.log.error("Pathways: Missing accountId or token");
			return false;
		}
		const workers = new WorkersAI({
			accountId,
			token,
			defaultModel: defaultModel || "@cf/meta/llama-3-8b-instruct",
		});

		this.log.verbose(`Detected commit command: ${releaseNotes}`);

		const commitsOutput = await this.exec(releaseNotes, { options: { write: false } });
		const { version } = this.config.getContext();
		this.log.info(`Generating a release note for ${version}...`);

		const notesOutput = await workers
			.callModel({
				input: {
					messages: [
						{
							role: "system",
							content:
								"You will read the commit diff and create a brief but natural release note of the updates (a few sentences). Discard any commits that are simply merging into the master branch. Include only the substantive changes, improvements, and fixes. Talk naturally and friendly, although some level of professionalism should be used.",
						},
						{
							role: "system",
							content:
								"An example, from 2.0.0:\n\n" +
								`This major release brings much-needed improvements, new features, and new uses of the Discord API itself. The bot's been remade from the ground up with a much-needed fresh coat of paint based off of the create-discord-bot boilerplate, a stable multi-channel history, slash commands, and much more!`,
						},
						{
							role: "user",
							content: "Commits: " + commitsOutput,
						},
						{
							role: "user",
							content: "New version: " + version,
						},
					],
				},
				maxTokens: 1000,
			})
			.then((r) => r.result?.response?.trim())
			.catch((e) => {
				console.error(e);
				return false;
			});
		if (!notesOutput) {
			this.log.error("Pathways: Couldn't generate a release note for " + version);
			return false;
		}
		this.log.info(`Created a release note for ${version} (using ${workers.defaultModel})`);

		const header = `**✨ Note: This release note was written by LLaMA and is not necessarily accurate. Please refer to the Commits section for more concise information on what's changed.**\n\n`;
		const commits = "## Commits\n\n" + commitsOutput;
		this.config.setContext({ notesOutput: header + notesOutput + "\n\n" + commits });
		return true;
	}
}

export default PathwaysReleaseItPlugin;
