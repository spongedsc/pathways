import { fetch } from "undici";
import { instructionSets } from "./constants.js";
import { WorkersAI } from "./index.js";
import { existsSync } from "node:fs";
import { v4 } from "uuid";

export class InteractionHistory {
	constructor(
		{ kv, instructionSet, baseHistory } = {
			kv: null,
			instructionSet: process.env.MODEL_LLM_PRESET || "default",
			baseHistory: [],
		},
	) {
		this.kv = kv;
		this.instructionSet = instructionSets[instructionSet || "default"];
		this.baseHistory = [
			...baseHistory,
			{
				role: "system",
				content: this.instructionSet,
			},
		];
	}

	async getHistory({ key }) {
		const fetchedMessages = (await this.kv.lRange(key, 0, -1))
			.reverse()
			.map((m) => JSON.parse(m))
			.reduce((acc, item, index) => {
				acc.push(item);
				if ((index + 1) % 20 === 0) {
					acc.push({
						role: "system",
						content: `Reminder: ${this.instructionSet}`,
					});
				}
				return acc;
			}, []);

		return [...this.baseHistory, ...fetchedMessages];
	}

	async add({ key, role, content, context }, returnOne) {
		const runOperation = async () => {
			return await this.kv.lPush(key, JSON.stringify({ role, content, context }));
		};

		if (returnOne) {
			await runOperation();

			return { role, content, context };
		} else {
			const base = await this.getHistory({ key });
			await runOperation();
			return [...base, { role, content, context }];
		}
	}

	async formatLog({ key, filter }) {
		const current = (
			await this.kv
				.lRange(key, 0, -1)
				.then((r) => r.map((m) => JSON.parse(m)))
				.catch(() => [])
		).reverse();
		const interactions = current?.filter(typeof filter === "function" ? filter : (f) => f);

		const formatted = interactions
			?.map((entry) => `Assistant on ${entry?.timestamp} UTC: ${entry?.content}`)
			?.join("\n\n==========\n\n");

		return formatted;
	}
}

export class InteractionResponse {
	constructor({ message, tz, accountId, token }) {
		this.message = message;
		this.author = message?.author;
		this.tz = tz || "Etc/UTC";
		this.workersAI = new WorkersAI({ accountId, token });
	}

	async authorPronouns() {
		const request = await fetch(`https://pronoundb.org/api/v2/lookup?platform=discord&ids=${this?.author?.id}`)
			.then((r) => r.json())
			.catch(() => ({}));

		const reqKeys = Object.keys(request);
		const userSets = request?.[id]?.sets;

		if (!reqKeys?.includes(id)) return "they/them";
		if (!userSets?.hasOwnProperty("en")) return "they/them";

		return userSets?.en?.join("/");
	}

	async imageRecognition() {
		if (this?.message?.attachments?.size === 0) return null;
		const image = await fetch(this?.message?.attachments?.first()?.url).then((r) => r.arrayBuffer());

		const callToModel = await this.workersAI
			.callModel({
				model: "@cf/llava-hf/llava-1.5-7b-hf",
				input: {
					image: [...new Uint8Array(image)],
					prompt: "Generate a caption for this image",
				},
				maxTokens: 256,
			})
			.then((r) => "(attached an image: " + String(r?.result?.description)?.toLowerCase() + ")")
			.catch(() => null);

		return callToModel;
	}

	async generateImage({ data }) {
		const callToModel = await this.workersAI
			.callModel(
				{
					model: "@cf/lykon/dreamshaper-8-lcm",
					input: {
						prompt: data,
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

	async formatUserMessage() {
		const username = this?.author?.username;
		const pronouns = await this.authorPronouns().catch(() => "they/them");
		const date = Temporal.Now.plainDateTimeISO(this?.tz || "Etc/UTC").toString() + " UTC";
		const content = this?.message?.content;

		const image = await this.imageRecognition();

		return `${username} (${pronouns}) on ${date}: ${content} ${image !== null ? "\n\nImage description: " + image : ""}`.trim();
	}

	formatAssistantMessage(content) {
		return content.trim();
	}

	formattedTz() {
		return Temporal.Now.plainDateTimeISO(this?.tz || "Etc/UTC").toString();
	}
}
