import { Plugin } from "release-it";
import { WorkersAI } from "../../src/util/models/index.js";
class SpongeChatReleaseItPlugin extends Plugin {
	async bump(version) {
		console.log(this.config, this.getContext());
		throw "a";
	}
}

export default SpongeChatReleaseItPlugin;
