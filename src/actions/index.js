/**
 * Defines the structure of an Action.
 *
 * @typedef {object} Action
 * @property {import('discord.js').RESTPostAPIApplicationCommandsJSONBody} data The data for the command
 * @property {(interaction: import('discord.js').ContextMenuCommandInteraction) => Promise<void> | void} execute The function to execute when the command is called
 */

/**
 * Defines the predicate to check if an object is a valid Command type.
 *
 * @type {import('../util/loaders.js').StructurePredicate<Action>}
 * @returns {structure is Action}
 */
export const predicate = (structure) =>
	Boolean(structure) &&
	typeof structure === "object" &&
	"data" in structure &&
	"execute" in structure &&
	typeof structure.data === "object" &&
	typeof structure.execute === "function";
