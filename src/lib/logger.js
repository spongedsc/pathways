import chalk from "chalk";
const logLevels = {
	default: {
		caller: chalk.bold.white,
		name: "Log",
	},
	info: {
		caller: chalk.bold.blue,
		name: "Info",
	},
	error: {
		caller: chalk.bold.red,
		name: "Error",
	},
	warn: {
		caller: chalk.bold.yellow,
		name: "Warn",
	},
};

const modules = {
	default: {
		caller: chalk.bold.white,
		name: "Log",
	},
	ai: {
		caller: chalk.bold.magenta,
		name: "AI",
	},
	callsystem: {
		caller: chalk.bold.cyan,
		name: "%LOGGER_VAR_CALLSYSTEM%",
	},
	core: {
		caller: chalk.bold.green,
		name: "Core",
	},
};

export class Logger {
	constructor({ callsystem = "default" }) {
		this.callsystem = callsystem;
	}
	callers({ module = "default" }) {
		const moduleCaller = moduleLogLevel?.caller || chalk.bold.white;
		const moduleName = moduleLogLevel?.name || module || "Legacy";

		return {
			moduleCaller,
			moduleName,
		};
	}

	fmt(message, level = "default", module = "default") {
		const { moduleCaller, moduleName } = this.callers({ module });
		const levelName = logLevels[level || "default"]?.name.toUpperCase();
		const levelCaller = logLevels[level || "default"]?.caller || chalk.bold.white;

		const formatted = message.replaceAll("%LOGGER_VAR_CALLSYSTEM%", "CS/" + (this.callsystem || "Legacy"));

		return `${levelCaller(levelName)} ${moduleCaller(moduleName)} ${formatted}`;
	}

	log(message, { module = "default", level = "default" }) {
		const formatted = this.fmt(message, level, module);
		console.log(formatted);
		return formatted;
	}

	info(message, { module = "default" }) {
		return this.log(message, { module, level: "info" });
	}

	error(message, { module = "default" }) {
		return this.log(message, { module, level: "error" });
	}

	warn(message, { module = "default" }) {
		return this.log(message, { module, level: "warn" });
	}
}
