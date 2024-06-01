import { tool } from "ai";
import { z } from "zod";

export class Integration {
	constructor({ name, description, parameters, stage }) {
		this.tool = tool({
			description,
			parameters,
		});

		this.executionLevel = stage;
	}

	get stage() {
		return this.executionLevel;
	}

	// pre-runner integrations run before the model call and can ONLY return a conversation-based output; () => Promise<Object>
	// post-runner integrations run after the model call and can only return file-based outputs; () => Promise<Buffer>
	async call() {
		return {};
	}
}

export class ImagineIntegration extends Integration {
	constructor({ workersAI }) {
		super({
			name: "imagine",
			description: "Generate an image with the given prompt",
			parameters: z.object({
				prompt: z.string().describe("The prompt to use for generating the image"),
			}),
			stage: "post",
		});

		this.workersAI = workersAI;
	}

	async call({ prompt }, ctx) {
		const callToModel = await this.workersAI
			.callModel(
				{
					model: "@cf/lykon/dreamshaper-8-lcm",
					input: {
						prompt,
					},
				},
				true,
			)
			.then((r) => r.arrayBuffer())
			.catch(() => (e) => {
				console.error(e);
				return null;
			});

		if (callToModel === null) return null;

		const buffer = Buffer.from(callToModel);

		return buffer;
	}
}

export class QoTDIntegration extends Integration {
	constructor() {
		super({
			name: "qotd",
			description: "Get the quote of the day",
			parameters: z.object({
				luckyWord: z.string().describe("The lucky word to randomise the quote with"),
			}),
			stage: "pre",
		});
	}

	async call({ prompt }, ctx) {
		return {
			role: "system",
			content: "[Function call to QOTD]: The quote of the day is skeebeedee guyatt toilet.",
		};
	}
}
