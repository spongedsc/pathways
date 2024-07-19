import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { personas } from "../../../../util/models/constants.js";

import { Caller as Workers } from "../models/workers.js";
import { Caller as OpenAICompatible } from "../models/openai.js";
import { nanoid } from "nanoid";

/* --marker:loader_exclude */
export const __loader_exclude = true;

/**
 *
 * @param {*} p
 * @returns {Workers | OpenAICompatible}
 */
export const determineCaller = (p) => (p === "WORKERS" ? Workers : OpenAICompatible);

/**
 *
 * @param {*} p
 * @returns {Workers | OpenAICompatible}
 */
export const determineGM = (p) => (p === "WORKERS" ? Workers : OpenAICompatible);

export const generateCallerMap = (env) => {
	const oaiCompatible = env.CALLER_PROVIDER === "OPENAI" ? env.OPENAI_ACCOUNT_TOKEN : env.OPENROUTER_ACCOUNT_TOKEN;

	return new Map(
		Object.entries({
			callerProvider: env.CALLER_PROVIDER || "WORKERS",
			callerModel: env.CALLER_MODEL || "@hf/nousresearch/hermes-2-pro-mistral-7b",
			callerAccountId: env.CLOUDFLARE_ACCOUNT_ID,
			callerAccountToken: env.CALLER_PROVIDER === "WORKERS" ? env.CLOUDFLARE_ACCOUNT_TOKEN : oaiCompatible,
		}),
	);
};

export const generateGenericModelMap = (env) => {
	const oaiCompatible = env.GM_PROVIDER === "OPENAI" ? env.OPENAI_ACCOUNT_TOKEN : env.OPENROUTER_ACCOUNT_TOKEN;

	return new Map(
		Object.entries({
			callerProvider: env.GM_PROVIDER || "WORKERS",
			callerModel: env.GM_MODEL || "@hf/nousresearch/hermes-2-pro-mistral-7b",
			callerAccountId: env.CLOUDFLARE_ACCOUNT_ID,
			callerAccountToken: env.GM_PROVIDER === "WORKERS" ? env.CLOUDFLARE_ACCOUNT_TOKEN : oaiCompatible,
		}),
	);
};

export const fetchIntegrations = (m) =>
	Array.from(m.keys())
		.filter((i) => {
			return i.startsWith("in.") && i.endsWith("-latest");
		})
		.map((i) => m.get(i));

export const adaptHistory = async (history, rec) => [
	...personas.integrationCaller.messages,
	...history
		.filter((m) => m.role !== "tool" && m.role !== "tool")
		.map((m) => ({ role: m.role, content: m.content }))
		.slice(0, 3),
	rec,
];

export const generateComponentsList = ({ type = "inactive", integrationsRequested, responses }) => {
	const styleMap = {
		active: ButtonStyle.Primary,
		inactive: ButtonStyle.Secondary,
		error: ButtonStyle.Danger,
	};

	const mainBtn = new ButtonBuilder()
		.setLabel(
			`${type === "active" ? "Using" : "Used"} "${integrationsRequested?.[0]?.toolName?.charAt(0).toUpperCase() + integrationsRequested?.[0]?.toolName?.slice(1)}"`,
		)
		.setStyle(styleMap[type || "inactive"])
		.setDisabled(true);

	if (responses?.length > 0) {
		const primary = responses?.find((r) => r.integration === integrationsRequested?.[0]?.toolName);

		if (primary?.data?.buttonText) mainBtn.setLabel(primary?.data?.buttonText);

		if (primary?.data?.buttonUrl)
			mainBtn
				.setStyle(ButtonStyle.Link)
				.setURL(responses?.find((r) => r.integration === integrationsRequested?.[0]?.toolName)?.data?.buttonUrl)
				.setDisabled(false);
	}

	if (mainBtn.data.style !== ButtonStyle.Link) mainBtn.setCustomId("using");

	const componentsList = new ActionRowBuilder().addComponents(
		mainBtn,
		...[
			integrationsRequested?.length > 1
				? new ButtonBuilder()
						.setCustomId("plus")
						.setLabel(`(and ${integrationsRequested.length - 1} others)`)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(true)
				: null,
		].filter((r) => r !== null),
	);

	if (integrationsRequested.length > 3) {
		componentsList.addComponents(
			new ButtonBuilder()
				.setCustomId("plusMore")
				.setLabel(`+ ${integrationsRequested.length - 3} more`)
				.setStyle(ButtonStyle.Primary)
				.setDisabled(true),
		);
	}

	return componentsList;
};

export const dummyTooLResult = ({ id, name, result, isError }) => [
	{
		role: "tool",
		content: [
			{
				type: "tool",
				toolCallId: id,
				toolName: name,
				result: result || "Error activating integration: Catastrophic failure",
				isError: isError || true,
			},
		],
	},
];

export const openChatify = (req, res) =>
	res.reduce((acc, parent) => {
		const addForHistory = parent.messages.map((i) => {
			const task = req.find((r) => r.function?.name === i?.toolName);
			return {
				role: "tool",
				tool_call_id: task?.id || nanoid(),
				name: i?.toolName,
				content: i?.result,
			};
		});

		acc.push(...addForHistory);
		return acc;
	}, []);

export const toolCallsToHistory = ({ formattedResponses, integrationsRequested, model, message, textResponse }) => [
	{
		role: "assistant",
		content: "",
		tool_calls: integrationsRequested.map((i) => ({
			id: i?.id,
			type: "function",
			function: i?.function,
		})),
	},
	...formattedResponses.map((r) => {
		const toSend = {
			...r,
			role: r.role || "system",
			content: r.content || "[No response was returned from the integration.]",
			tool_calls: r.tool_calls,
			tool_call_id: r.tool_call_id,
			context: {
				model: model,
			},
		};

		if (r?.role === "tool" && !r?.tool_call_id) toSend.tool_call_id = nanoid();

		return toSend;
	}),
	{
		contextId: message?.id,
		role: "assistant",
		content: textResponse || "[No response was returned.]",
		context: {
			model: model,
		},
	},
];

export const generateCredentials = (ctx) => {
	const provider = ctx.get("callerProvider");

	if (provider === "OPENAI") return { key: ctx.get("callerAccountToken") };
	if (provider === "OPENROUTER") return { key: ctx.get("callerAccountToken"), apiUrl: `https://openrouter.ai/api/v1` };
	if (provider === "WORKERS") return { key: ctx.get("callerAccountToken"), accountId: ctx.get("callerAccountId") };
};
