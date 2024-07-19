import { z } from "zod";
import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { nanoid } from "nanoid";
import zodToJsonSchema from "zod-to-json-schema";
import { fetch } from "undici";

class OpenAI {
	constructor({ key, apiUrl = "https://api.openai.com/v1" }) {
		this.key = key;
		this.apiUrl = apiUrl;
		this.providerInstance = createOpenAI({ apiKey: this.key, baseURL: this.apiUrl });
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
		tool_choice,
	}) {
		const toCall = tools.map((tool) => {
			try {
				const toolSchema = zodToJsonSchema(tool.function.parameters);

				return {
					type: "function",
					function: {
						...(tool?.function || {}),
						parameters: toolSchema || {},
					},
				};
			} catch (e) {
				console.log(e);
				return {
					...(tool?.function || {}),
				};
			}
		});

		const adjoined = {
			model: model || "gpt-4o",
			messages: messages.map((m) => ({
				role: m.role,
				tool_call_id: m.tool_call_id,
				content: m.content,
				tool_calls: m.tool_calls,
			})),
			temperature,
			top_p,
			frequency_penalty,
			presence_penalty,
			max_tokens,
			stop,
			tools: toCall,
			tool_choice,
		};

		const response = await fetch(`${this.apiUrl}/chat/completions`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(adjoined),
		})
			.then((res) => res.json())
			.catch((err) => {
				console.error(err);
				return {};
			});

		const toolCallMessage = response.choices.find((c) => c.finish_reason === "tool_calls") || {};
		const actualResponse = response.choices.find((c) => c.finish_reason === "stop") || {};

		const toolCalls = toolCallMessage.message?.tool_calls?.map((t) => {
			return {
				type: "tool",
				id: t?.id,
				toolName: t?.function?.name,
				args: t?.function?.arguments,
				function: t?.function,
			};
		});

		return {
			success: response.success || false,
			text: actualResponse?.message?.content || "",
			toolCalls: toolCalls || [],
		};
	}
}

export { OpenAI as Caller };
