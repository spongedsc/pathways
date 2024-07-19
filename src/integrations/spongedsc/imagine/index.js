import { z } from "zod";
import { Integration } from "../../../callsystems/spongedsc/integrations/lib/class.js";
import { Caller as Model } from "../../../callsystems/spongedsc/integrations/models/workers.js";
import { tool } from "ai";
import dedent from "dedent";
export default class HelloWorld extends Integration {
	constructor(opts) {
		const { env, message, client, std, provider } = opts || {};
		super({ env, message, client, std, provider });
	}

	static get packageId() {
		return "in.spongedsc.imagine";
	}

	static get name() {
		return "Imagine";
	}

	static get version() {
		return "0.0.1";
	}

	static get tool() {
		return {
			type: "function",
			function: tool({
				name: "imagine",
				description: "Generate an image based on a prompt using generative models.",
				parameters: z.object({
					prompt: z.string().describe("Describe the image you want to generate."),
				}),
			}),
		};
	}

	static get releaseDate() {
		return new Date("2024-07-18");
	}

	/**
	 * This function is called when the integration is activated by the Integrations callsystem.
	 * @param {object[]} arguments The arguments passed to the integration.
	 * @returns {Promise<IntegrationResponse>} The response to the activation request.
	 */
	async activate({ arguments: args }) {
		const { env, message, client } = this;

		const model = new Model({
			key: env.CLOUDFLARE_ACCOUNT_TOKEN,
			accountId: env.CLOUDFLARE_ACCOUNT_ID,
		});

		const response = await model.call({
			model: "@cf/bytedance/stable-diffusion-xl-lightning",
			prompt: args.prompt || "A cute cat",
		});

		return {
			success: true,
			messages: [
				{
					role: "tool",
					content: dedent`The image was generated.`,
				},
			],
			data: {
				buttonText: `Imagine (SDXL Lightning): ${args.prompt || "A cute cat"}`.slice(0, 70),
				attachments: [
					{
						name: "image.png",
						attachment: Buffer.from(response),
					},
				],
			},
		};
	}
}
