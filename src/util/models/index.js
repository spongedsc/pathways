import { fetch } from "undici";
import { InteractionResponse, InteractionHistory, InteractionMessageEvent } from "./interactions.js";

export class WorkersAI {
	constructor(
		{ accountId, token, defaultModel } = {
			accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
			token: process.env.CLOUDFLARE_ACCOUNT_TOKEN,
		},
	) {
		this.accountId = accountId;
		this.token = token;
		this.defaultModel = defaultModel;
	}

	async callModel(
		{ model, input, options, maxTokens } = {
			model: this.defaultModel || "@cf/meta/llama-3-8b-instruct",
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

		const request = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model || this.defaultModel || "@cf/meta/llama-3-8b-instruct"}`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(adjoined),
			},
		);

		if (raw) return request;

		return await request.json();
	}
}

export class ModelInteractions {
	constructor(
		opts = {
			model: "@cf/meta/llama-3-8b-instruct",
		},
		disabledModules = [],
	) {
		this.disabledModules = disabledModules;
		this.history = disabledModules?.includes("history") ? null : new InteractionHistory(opts);
		this.response = disabledModules?.includes("response") ? null : new InteractionResponse(opts);
		this.messageEvent = disabledModules?.includes("messageEvent")
			? null
			: new InteractionMessageEvent({
					...opts,
					interactionResponse: this.response,
					interactionHistory: this.history,
				});

		this.model = opts?.model;
	}
}
