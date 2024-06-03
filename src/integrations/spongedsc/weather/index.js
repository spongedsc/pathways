import { z } from "zod";
import { Integration } from "../../../callsystems/spongedsc/integrations/lib/class.js";
import { tool } from "ai";
export default class HelloWorld extends Integration {
	constructor(opts) {
		const { env, message, client, std, provider } = opts || {};
		super({ env, message, client, std, provider });
	}

	static get packageId() {
		return "in.spongedsc.weather";
	}

	static get name() {
		return "Weather";
	}

	static get version() {
		return "0.0.1";
	}

	static get tool() {
		return {
			type: "function",
			function: tool({
				name: "weather",
				description: "Get the weather for a given location",
				parameters: z.object({
					location: z.string().describe("The location to get the weather for"),
				}),
			}),
		};
	}

	static get releaseDate() {
		return new Date("2023-06-02");
	}

	/**
	 * This function is called when the integration is activated by the Integrations callsystem.
	 * @param {object[]} arguments The arguments passed to the integration.
	 * @returns {Promise<IntegrationResponse>} The response to the activation request.
	 */
	async activate({ arguments: args }) {
		const { env, message, client } = this;

		return {
			success: true,
			messages: [
				{
					role: "tool",
					content: `The weather in ${args.location} is 17 degrees celsius. It is raining`,
				},
			],
			data: {},
		};
	}
}
