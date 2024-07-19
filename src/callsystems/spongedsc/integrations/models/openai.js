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
		try {
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

			// reduce processedMessages to remove duplicate tool_call_id's
			const processedMessages = messages.reduce((acc, m) => {
				if (!m.tool_call_id) return [...acc, m];

				// check if message already exists
				const existing = acc.find((a) => a.tool_call_id === m.tool_call_id);
				if (existing) {
					console.log("Duplicate tool_call_id found, removing");
					console.log(m, existing);
					return acc;
				}

				// get index of message
				const index = [...acc, m].findIndex((a) => a === m);

				// get the message before the existing message
				const before = acc[index - 1];

				// if the message before the existing doesn't have "tool_calls", don't add the message
				if (!before?.tool_calls) return acc;

				return [...acc, m];
			}, []);

			const adjoined = {
				model: model || "gpt-4o",
				messages: processedMessages
					.map((m) => ({
						role: m.role,
						tool_call_id: m.tool_call_id,
						content: m.content,
						tool_calls: m.tool_calls,
					}))
					.filter((m) => !(m.role === "tool" && !m.tool_call_id)),
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

			if (response.error) throw response;

			if (!response.choices) {
				throw new Error("Error calling OpenAI-compatible inference provider");
			}

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
		} catch (e) {
			const moderated = e?.error?.message?.includes("requires moderation");
			if (!moderated) console.error(e);
			return {
				success: false,
				text: "-# There was an error when attempting to call the inference provider. Please try again later.",
				toolCalls: moderated
					? [
							{
								error: true,
								content: e?.error,
							},
						]
					: [],
			};
		}
	}
}

export { OpenAI as Caller };
