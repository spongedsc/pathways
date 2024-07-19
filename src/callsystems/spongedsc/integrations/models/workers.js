import { z } from "zod";
import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { nanoid } from "nanoid";
import zodToJsonSchema from "zod-to-json-schema";
import { fetch } from "undici";

class Workers {
	constructor({
		key,
		accountId,
		apiUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai`,
	}) {
		this.key = key;
		this.apiUrl = apiUrl;
		this.accountId = accountId;
	}

	async call({
		model,
		messages,
		prompt,
		temperature = 0,
		top_p = 1,
		frequency_penalty = 0,
		presence_penalty = 0,
		max_tokens = 2048,
		stop = null,
		tools = [],
	}) {
		const toCall = tools.map((tool) => {
			try {
				const toolSchema = zodToJsonSchema(tool.function.parameters);

				return {
					...(tool?.function || {}),
					parameters: toolSchema,
				};
			} catch (e) {
				return {
					...(tool?.function || {}),
				};
			}
		});

		const adjoined = {
			messages,
			prompt,
			tools: toCall,
		};

		const modelQuerySearch = await fetch(`${this.apiUrl}/models/search?search=${model}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.key}`,
				"Content-Type": "application/json",
			},
		})
			.then((res) => res.json())
			.then((res) => res.result || [])
			.catch((err) => {
				console.log(err);
				return [];
			});

		if (!modelQuerySearch.map((m) => m.name).includes(model))
			return {
				success: false,
				error: "Model not found",
				data: {},
			};

		const modelMetadata = modelQuerySearch.find((m) => m.name === model);

		const request = await fetch(`${this.apiUrl}/run/${modelMetadata?.name}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(adjoined),
		});

		if (modelMetadata?.task?.name === "Text-to-Image") return await request.arrayBuffer();

		const response = await request.json();
		const toolCalls = [response.result?.tool_calls]
			.map((t) => {
				return {
					toolName: t?.name,
					args: t?.arguments,
				};
			})
			.filter((t) => t?.toolName && t?.args);

		return {
			success: response.success || false,
			text: response.result?.response || "",
			toolCalls: toolCalls?.length > 0 ? toolCalls : [],
		};
	}
}

export { Workers as Caller };
