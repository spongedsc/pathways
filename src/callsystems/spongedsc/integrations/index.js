import Legacy from "../../spongedsc/legacy/index.js";
import { Caller as Workers } from "./models/workers.js";
import { Caller as OpenAICompatible } from "./models/openai.js";
import { Callsystem } from "../../../lib/callsystems/index.js";
import { Temporal } from "temporal-polyfill";
import { HistoryManager } from "../../../lib/callsystems/std/managers/history.js";
import {
	adaptHistory,
	determineCaller,
	determineGM,
	fetchIntegrations,
	generateCredentials,
	generateCallerMap,
	generateComponentsList,
	generateGenericModelMap,
	openChatify,
	toolCallsToHistory,
	wakeUp,
} from "./lib/helpers.js";
import dedent from "dedent";

export default class Integrations extends Callsystem {
	constructor(opts) {
		const { env, message, client, defaultModel, defaultProvider } = opts || {};
		super({ env, message, client, defaultModel, defaultProvider });
	}

	static get packageId() {
		return "cs.spongedsc.integrations";
	}

	static get name() {
		return "Integrations";
	}

	static get version() {
		return "0.0.1";
	}

	static get releaseDate() {
		return new Date("2024-06-02");
	}

	static get capabilities() {
		return ["text", "vision", "image", "tools"];
	}

	static get managerOptions() {
		return {
			contextWindow: 5,
			instructionSet: "default",
			recordTemplate: "%USER% (%PRONOUNS%) at %TIMESTAMP%: %RESPONSE%",
			variables: {},
		};
	}

	async activate() {
		const { message, client, env } = this;

		const wasSleeping = await wakeUp(client.tempStore, this.std.kv);
		if (wasSleeping) {
			message.content = "*You were sleeping and I woke you up.*\n\n" + message.content;
			message.wasSleeping = true;
		}

		const callerCtx = generateCallerMap(env);
		const gmCtx = generateGenericModelMap(env);

		const hisMan = new HistoryManager({
			kv: this.std.kv,
			instructionSet: client?.tempStore.get("instructionSet") || env?.MODEL_LLM_PRESET || "default",
			baseHistory: [],
			model: callerCtx.get("callerModel") || "@hf/nousresearch/hermes-2-pro-mistral-7b",
			contextWindow: 10,
			recordTemplate:
				this.constructor.managerOptions.recordTemplate || "%USER% (%PRONOUNS%) at %TIMESTAMP%: %RESPONSE%",
			variables: {
				...(this.constructor.managerOptions.variables || {}),
				"%PRONOUNS%": "they",
				"%USER%": message.author.username,
				"%TIMESTAMP%": Temporal.Now.plainDateTimeISO(this?.tz || "Etc/UTC").toString(),
			},
			keyPrefix: "unified",
		});

		const CallerProvider = determineCaller(callerCtx.get("callerProvider"));
		const GMProvider = determineGM(gmCtx.get("callerProvider"));

		const integrations = fetchIntegrations(client.integrationsMap);
		const integrationCallHistory = await adaptHistory(await hisMan.get(message.channel.id, false), {
			contextId: message.id,
			role: "user",
			content: hisMan.transformContent(message.content, "user", hisMan.options.variables),
			context: {
				respondingTo: message.id,
				timestamp: Temporal.Now.plainDateTimeISO(this?.tz || "Etc/UTC").toString(),
			},
		});

		await message.channel.sendTyping();

		const integrationCaller = new CallerProvider(generateCredentials(callerCtx));

		const { text: placeholderText, toolCalls: integrationsRequested } = await integrationCaller
			.call({
				model: callerCtx.get("callerModel") || "@hf/nousresearch/hermes-2-pro-mistral-7b",
				messages: integrationCallHistory,
				tools: integrations.map((i) => i.tool).filter((t) => !(wasSleeping && t.function.name === "sleep")),
			})
			.catch(async (e) => {
				this.std.log({ level: "error", message: "Error calling integrations" });
				await message.react("⚠️").catch(() => {});
				return [
					{
						error: true,
						content: e,
					},
				];
			});

		if (integrationsRequested.find((r) => r.error)) {
			const error = integrationsRequested.find((r) => r.error);
			console.error(error.content);

			if (error?.content?.message?.includes("requires moderation")) {
				await message.react("🛡️").catch(() => {});
				message.moderated = true;
				message.moderationTags = error?.content?.metadata?.reasons;
				message.content =
					"CONTEXT: This message is moderated. It may be best to mention this to the user.\n\n" + message.content;
			} else {
				await message.react("⚠️").catch(() => {});
			}

			const callsystemInstance = new Legacy({ env, message, client });
			return await callsystemInstance.activate();
		}

		const integrationsResponses = await Promise.all(
			integrationsRequested.map(async (i) => {
				const integrationClass = integrations.find((int) => int.tool?.function?.name === i.toolName);
				const integration = new integrationClass({ env, message, client, std: this.std, provider: this.provider });
				return await integration
					.activate({
						arguments: typeof i.args === "string" ? JSON.parse(i.args) : i.args,
					})
					.then((r) => ({
						...r,
						messages: r.messages.map((m) => ({
							type: "tool",
							toolCallId: i.toolCallId,
							toolName: i.toolName,
							result: m.content,
							isError: false,
						})),
						integration: i.toolName,
					}))
					.catch((e) => {
						this.std.log({ level: "error", message: "Error activating integration" });
						console.error(e);
						return {
							success: false,
							messages: dummyToolResult({
								id: i.toolCallId,
								name: i.toolName,
								isError: true,
								result: "Catastrophic failure",
							}),
							data: {
								message: "Catastrophic failure to activate integration",
							},
						};
					});
			}),
		);

		if (integrationsResponses.length === 0) {
			const callsystemInstance = new Legacy({ env, message, client });
			return await callsystemInstance.activate();
		}

		const trimmedText =
			(placeholderText + "\n" || "") +
			`-# Using **${integrationsRequested?.length || 0}** integration${integrationsRequested?.length === 1 ? "" : "s"}`;

		const response = await message
			.reply({
				...this.std.responseTransform({ content: trimmedText }),
				components: [generateComponentsList({ integrationsRequested, type: "active" })],
			})
			.catch((e) => {
				this.std.log({ level: "error", message: "Error sending response" });
				console.error(e);
				return null;
			});

		if (!response) return;

		const history = await hisMan
			.add(message.channel.id, {
				contextId: message?.id,
				role: "user",
				content: message.content,
			})
			.catch((e) => {
				this.std.log({ level: "error", message: e });
				console.error(e);
				return [];
			});

		const formattedResponses = openChatify(integrationsRequested, integrationsResponses);
		const toSend = [
			...history.map((m) => {
				const toSend = {
					role: m.role,
					content: m.content,
					tool_calls: m.tool_calls,
					tool_call_id: m.tool_call_id,
				};

				if (m?.role === "tool" && !m?.tool_call_id) toSend.tool_call_id = nanoid();
				return toSend;
			}),
			{
				role: "assistant",
				content: placeholderText,
				tool_calls: integrationsRequested.map((i) => ({
					id: i?.id,
					type: "function",
					function: i?.function,
				})),
			},
			...formattedResponses,
		];

		// workers
		const textModel = new GMProvider(generateCredentials(gmCtx));
		const textResponse = await textModel
			.call({
				model: gmCtx.get("callerModel") || "@hf/nousresearch/hermes-2-pro-mistral-7b",
				messages: toSend,
				tools: integrations.map((i) => i.tool).filter(() => gmCtx.get("callerModel").includes("openai")),
				tool_choice: "none",
			})
			.catch((e) => {
				this.std.log({ level: "error", message: "Error calling text model" });
				console.error(e);
				return "";
			})
			.then((r) => {
				return r.text || "[No response was returned.]";
			});

		const primaryResponse = integrationsResponses.find((r) => r.integration === integrationsRequested?.[0]?.toolName);

		await response.edit({
			...this.std.responseTransform({
				content:
					textResponse +
					`\n-# Using **${integrationsRequested?.length || 0}** integration${integrationsRequested?.length === 1 ? "" : "s"}`,
			}),
			components: [
				generateComponentsList({ integrationsRequested, type: "inactive", responses: integrationsResponses }),
			],
			files: primaryResponse?.data?.attachments || [],
		});

		await hisMan.addMany(
			message.channel.id,
			[
				...toolCallsToHistory({
					integrationsRequested,
					formattedResponses,
					model: callerCtx.get("callerModel") || "@hf/nousresearch/hermes-2-pro-mistral-7b",
					message,
					textResponse,
				}),
			],
			false,
			true,
			{ template: "%RESPONSE%" },
		);

		return {
			success: true,
			summary: "Integrations activated",
			context: {},
		};
	}
}
