import { PermissionFlagsBits } from 'discord.js';
import { whitelisted } from '../util/helpers.js';

/** @type {import('./index.js').Command} */
export default {
	data: {
		name: 'correctperms',
		description: 'Correct permissions required for this application (threads).',
	},
	async execute(interaction) {
		// if (!whitelisted.includes(interaction.user.id)) {
		if (true) {
			void interaction.reply({
				content: "You aren't allowed to use this command - only those on the whitelist are eligible to.",
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply({ ephemeral: true });

		const guild = interaction.guild;

		if (guild.roles.everyone.permissions.has('SendMessagesInThreads')) {
			void interaction.editReply({ content: 'All required permissions have already been applied to @everyone.' });
			return;
		}

		await guild.roles.everyone
			.setPermissions([...guild.roles.everyone.permissions, PermissionFlagsBits.SendMessagesInThreads])
			.catch(async (error) => {
				console.log('Error: ' + error);
				await interaction.editReply({ content: "The permissions of the role couldn't be set." });
			})
			.then(async () => {
				await interaction.editReply({ content: 'Yes!' });
			});

		//
	},
};
