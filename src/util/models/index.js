import { fetch } from "undici";
import { InteractionResponse, InteractionHistory } from "./interactions.js";

export class WorkersAI {
	constructor(
		{ accountId, token } = {
			accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
			token: process.env.CLOUDFLARE_ACCOUNT_TOKEN,
		},
	) {
		this.accountId = accountId;
		this.token = token;
	}

	async callModel(
		{ model, input, options, maxTokens } = {
			model: "@cf/meta/llama-3-8b-instruct",
			input: {},
			options: {},
		},
		raw = false,
	) {
		const adjoined = {
			...options,
			...input,
			maxTokens,
		};

		const request = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(adjoined),
		});

		if (raw) return request;

		return await request.json();
	}
}

export class ModelInteractions {
	constructor(opts) {
		this.history = new InteractionHistory(opts);
		this.response = new InteractionResponse(opts);
	}
}
