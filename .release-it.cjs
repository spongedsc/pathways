module.exports = {
	git: {
		commitMessage: "🔖 bump: release v${version}",
		requireCleanWorkingDir: false,
	},
	github: {
		release: true,
		draft: true,
		web: true,
		releaseName: "{version}: ",
		autoGenerate: true,
	},
	npm: {
		publish: false,
	},
	plugins: {
		"./ci/release-it/plugin.js": {
			accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
			token: process.env.CLOUDFLARE_ACCOUNT_TOKEN,
			defaultModel: "@cf/meta/llama-3-8b-instruct",
		},
	},
};
