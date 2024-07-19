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
		return "in.spongedsc.sleep";
	}

	static get name() {
		return "Sleep";
	}

	static get version() {
		return "0.0.1";
	}

	static get tool() {
		return {
			type: "function",
			function: tool({
				name: "sleep",
				description:
					"When the user tells you to keep quiet, to go to bed, or to shut up, you will execute this integration. WARNING: Only use when requested to or when you're being ignored generally, you won't be able to respond until the user unmutes you.",
				parameters: z.object({}),
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

		client.tempStore.set("silentMode", true);
		const op = await client.kv
			.set("silentMode", "true")
			.then(() => true)
			.catch((r) => {
				console.error(r);
				return false;
			});

		return {
			success: op,
			messages: [
				{
					role: "tool",
					content: op
						? `Success. Generate a final response before shutting up.`
						: `Failed to enable silent mode. Apologise and continue as usual.`,
				},
			],
			data: {},
		};
	}
}
