import process from "node:process";
import { fetch } from "undici";

export const whitelisted = ["181944866987704320", "532053122017787924"];

export class Environment {
	constructor({ register } = {}) {
		this.register = register || process.env;
	}

	getRuntimeScenario() {
		const useCase = (this.register.NODE_ENV || "PRODUCTION").toLowerCase();

		switch (useCase) {
			case "development":
				return "development";

			case "dev":
				return "development";

			case "staging":
				return "staging";

			case "stage":
				return "staging";

			default:
				return "production";
		}
	}
}
