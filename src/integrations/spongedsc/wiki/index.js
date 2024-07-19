import { z } from "zod";
import { Integration } from "../../../callsystems/spongedsc/integrations/lib/class.js";
import wiki from "wikipedia";
import { tool } from "ai";
import dedent from "dedent";
import { NodeHtmlMarkdown } from "node-html-markdown";
export default class HelloWorld extends Integration {
	constructor(opts) {
		const { env, message, client, std, provider } = opts || {};
		super({ env, message, client, std, provider });
	}

	static get packageId() {
		return "in.spongedsc.wiki";
	}

	static get name() {
		return "Wiki";
	}

	static get version() {
		return "0.0.1";
	}

	static get tool() {
		return {
			type: "function",
			function: tool({
				name: "wikipedia",
				description:
					"Get information about a topic from Wikipedia. Trigger this integration when a user asks you to look up something on Wikipedia.",
				parameters: z.object({
					topic: z.string().describe("The topic to look up on Wikipedia."),
					full: z
						.boolean()
						.describe(
							"Whether to return the full page or just the summary. Using this will result in a penalty of ten points, only use if necessary.",
						)
						.default(false)
						.optional(),
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

		const search = await wiki
			.search(args.topic)
			.then((r) => r.results[0])
			.catch((e) => {
				return {};
			});

		const page = await wiki.page(search.title).catch((e) => {
			return {};
		});

		const summary = await page.summary({ redirect: false }).catch((e) => {
			return {};
		});

		const extract = await page
			.mobileHtml({ redirect: false })
			.catch((e) => {
				return {};
			})
			.then((r) => NodeHtmlMarkdown.translate(r));

		if (args.full) await message?.react("⏳").catch(() => {});

		return {
			success: true,
			messages: [
				{
					role: "tool",
					content: dedent`
                    IMAGE URL: ${page?.originalimage?.url || "[Image not found]"}
                    
                    ${page?.title || "[Title not found]"}:
                    ${args.full ? extract : summary.extract || "[Content not found]"}
                    `,
				},
			],
			data: {
				buttonUrl:
					summary?.content_urls?.desktop?.page || "https://en.wikipedia.org/wiki/Special:Search?search=" + args.topic,
				buttonText: `Wikipedia (${args.full ? "full" : "summary"}): ${args.topic}`.slice(0, 50),
			},
		};
	}
}
