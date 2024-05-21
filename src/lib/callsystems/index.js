import { WorkersAI } from "../../util/models/index.js";
import { Logger } from "../logger.js";

/**
 * @typedef {string} CallsystemCapabilities
 * @readonly
 */

/**
 * @enum {CallsystemCapabilities}
 */
export const VALID_CAPABILITIES = ["text", "vision", "image", "ears", "audio", "tools", "legacy"];

/**
 * @typedef {object} CallsystemActivationResponse The response to a callsystem activation request
 * @property {boolean} success Whether the activation was successful
 * @property {string | null} summary A brief summary of any information that needs to be known about the activation
 * @property {object | null} context A context object that can be used to store any additional data (i.e. message/user ID)
 */

export class CallsystemStd {
	constructor({ callsystemName }) {
		this.callsystem = callsystemName;
	}

	static conditions(message, env) {
		const client = message?.client;

		const channelSetlist = env.ACTIVATION_CHANNEL_SETLIST.split(",");
		const channelSatisfies = channelSetlist?.includes(message?.channel?.id);

		// a bot mention supercedes all other cases; if the message mentions the bot, it's valid
		const mentionCase = message?.mentions?.has(client?.user?.id);
		// these conditions MUST return true for the message to be valid
		const whitelistCase = process.env.ACTIVATION_MODE === "WHITELIST" && channelSatisfies;
		const blacklistCase = process.env.ACTIVATION_MODE === "BLACKLIST" && !channelSatisfies;

		// these conditions MUST return false for the message to be invalid
		const commentCase = message?.content?.startsWith("!!");
		const silentModeCase = client.tempStore.get("silentMode") === true;

		// if there isn't a comment, then the bot MUST not be mentioned, the whitelist/blacklist MUST be met, and silent mode MUST be off
		return !commentCase && (mentionCase || ((whitelistCase || blacklistCase) && !silentModeCase));
	}

	responseTransform({ content, files }) {
		if (!content)
			return {
				content: "",
				files: [],
			};

		const returnContent = content?.length >= 2000 ? "" : content;
		const returnFiles =
			content?.length >= 2000
				? [{ attachment: Buffer.from(text, "utf-8"), name: "response.md" }, ...files]
				: [...files];

		return {
			content: returnContent,
			files: returnFiles,
		};
	}

	log({ message, level = "default" }) {
		const logger = new Logger({
			callsystem: this.callsystem || "Legacy",
		});
		return logger.log(message, { level, module: "ai" });
	}
}

export class Callsystem {
	constructor({ env, message, client, defaultModel, defaultProvider }) {
		this.env = env;
		this.client = client;
		this.message = message;
		this.defaultModel = defaultModel;
		this.defaultProvider = defaultProvider;
		this.provider = new WorkersAI({
			accountId: this.env?.CLOUDFLARE_ACCOUNT_ID,
			token: this.env?.CLOUDFLARE_ACCOUNT_TOKEN,
			defaultModel: this.defaultModel,
		});
		this.std = new CallsystemStd({ callsystemName: this.name });
	}

	/**
	 * This should return the package ID of the callsystem. Callsystem package IDs are used to identify the callsystem internally.
	 *
	 * The package ID can be any string, but we recommend using a namespaced format (e.g. "cs.example.mycallsystem").
	 * @returns {string} The package ID of the callsystem.
	 * @example
	 * class Legacy extends Callsystem {
	 *     static get packageId() {
	 *         return "cs.spongedsc.legacy";
	 *     }
	 * }
	 *
	 * Legacy.packageId; // => "cs.spongedsc.legacy"
	 */
	static get packageId() {
		return "cs.spongedsc.legacy";
	}

	/**
     * This should return the callsystem's name.
     * @returns {string} A string that represents the callsystem's name.
     * @example 
    class Legacy extends Callsystem {
        get name() {
            return "Legacy";
        }
    };
    
    new Legacy.name; // => "Legacy"
    */
	static get name() {
		return "Base Callsystem";
	}

	/**
	 * This should return a version string for the callsystem. Core uses this for debugging and versioning purposes.
	 * 
     * We recommend that you use semantic versioning (https://semver.org/), but Core will not enforce this.
	 * @returns {string} A version string for the callsystem.
     * @example 
    class Legacy extends Callsystem {
       static get version() {
           return "2.0.1";
       }
    };
       
    new Legacy.version; // => "2.0.1"
	*/
	static get version() {
		return "0.0.1";
	}

	/**
	 * This should always return a static array of what the callsystem supports.
	 * See CallsystemCapabilities for a list of valid capabilities.
     * @example 
    class Integrations extends Callsystem {
        static get capabilities() {
            return ["text", "image", "tools", "internet"];
        }
    };
       
    new Integrations.capabilities; // => ["text", "image", "tools", "internet"]
	 * @property {string} text Capable of text generation
	 * @property {string} vision Capable of vision (image classification)
	 * @property {string} image Capable of image generation
	 * @property {string} ears Capable of hearing (audio transcription)
	 * @property {string} audio Capable of audio generation
	 * @property {string} tools Capable of tool calls and function calling
	 * @property {string} legacy All capabilities enabled; this should not be used and is only included for the Legacy callsystem
	 * @returns {CallsystemCapabilities[]} A list of valid capabilities
    */
	static get capabilities() {
		return [];
	}

	/**
	 * The main lifecycle function for the callsystem. Model calls and context should be handled here.
	 *
	 * This function is called when passive activation is triggered (i.e. sending a message in a whitelisted/unblacklisted channel, pinging the bot).
	 * @returns {Promise<CallsystemActivationResponse>} The response to the activation request
	 * @example
	 * class Legacy extends Callsystem {
	 *     async activate() {
	 *         return {
	 *             success: true,
	 *             message: null,
	 *             context: {}
	 *         }
	 *     }
	 * }
	 *
	 * await new Legacy().activate(); // => { success: true, message: , context: {} }
	 */
	async activate() {
		return {
			success: true,
			summary: null,
			context: {},
		};
	}
}

export const predicate = (structure) =>
	Boolean(structure) &&
	Object.getPrototypeOf(structure.prototype).constructor === Callsystem &&
	typeof structure.packageId === "string" &&
	typeof structure.name === "string" &&
	typeof structure.version === "string" &&
	Array.isArray(structure.capabilities) &&
	typeof new structure().activate === "function";
