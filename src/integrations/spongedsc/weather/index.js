import { z } from "zod";
import { Integration } from "../../../callsystems/spongedsc/integrations/lib/class.js";
import { tool } from "ai";
import { fetch } from "undici";
import dedent from "dedent";
import { codes as wmo } from "./wmo.data.js";
import { unitSuffixes } from "./localisation.js";
export default class HelloWorld extends Integration {
	constructor(opts) {
		const { env, message, client, std, provider } = opts || {};
		super({ env, message, client, std, provider });
	}

	static get packageId() {
		return "in.spongedsc.weather";
	}

	static get name() {
		return "Weather";
	}

	static get version() {
		return "0.1.0";
	}

	static get tool() {
		return {
			type: "function",
			function: tool({
				name: "weather",
				description: "Get the weather for a given location",
				parameters: z.object({
					location: z
						.string()
						.describe("The location to get the weather for. By default, this is set to Greenwich, London.")
						.default("Greenwich, London")
						.optional(),
					units: z
						.string()
						.describe(
							"The units to use for the temperature (metric, imperial, or scientific). By default, this is set to metric.",
						)
						.default("metric")
						.optional(),
				}),
			}),
		};
	}

	static get releaseDate() {
		return new Date("2024-07-18");
	}

	/**
	 * This function is called when the integration is activated by the Integrations callsystem.
	 * @param {object[]} arguments The arguments passed to the integration.
	 * @returns {Promise<IntegrationResponse>} The response to the activation request.
	 */
	async activate({ arguments: args }) {
		const { env, message, client } = this;

		const unitArg = Object.keys(unitSuffixes).find((u) => args.units?.includes(u)) ? args.units : "metric";

		const pois = await fetch(
			`https://nominatim.openstreetmap.org/search?addressdetails=1&q=${args.location || "Greenwich, London"}&format=jsonv2&limit=1`,
		)
			.then((res) => res.json())
			.catch((err) => {
				console.log(err);
				return [];
			});

		if (pois.length === 0) {
			return {
				success: false,
				messages: [
					{
						role: "tool",
						content: `The weather in ${args.location} is unknown`,
					},
				],
				data: {},
			};
		}

		const weather = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${pois[0]?.lat}&longitude=${pois[0]?.lon}&current=temperature_2m,is_day,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1${unitArg === "imperial" || unitArg === "fahrenheit" ? "&temperature_unit=fahrenheit" : ""}`,
		)
			.then((res) => res.json())
			.catch((err) => {
				console.log(err);
				return {};
			});

		const isDay = weather?.current?.is_day === 1;

		const isKelvin = unitArg === "kelvin" || unitArg === "scientific";

		const infoMap = new Map(
			Object.entries({
				current: isKelvin ? weather?.current?.temperature_2m || 0 + 273.15 : weather?.current?.temperature_2m,
				currentWeather: wmo[weather?.current?.weather_code]?.[isDay ? "day" : "night"],
				todayWeather: wmo[weather?.daily?.weather_code?.[0]]?.[isDay ? "day" : "night"],
				high: isKelvin
					? (weather?.daily?.temperature_2m_max?.[0] || 0) + 273.15
					: weather?.daily?.temperature_2m_max?.[0],
				low: isKelvin
					? (weather?.daily?.temperature_2m_min?.[0] || 0) + 273.15
					: weather?.daily?.temperature_2m_min?.[0],
			}),
		);

		const formatMap = new Map(
			Object.entries({
				current: `${infoMap.get("current") || "<unknown>"}${unitSuffixes[unitArg || "metric"]?.temperature}`,
				currentWeather: infoMap.get("currentWeather")?.description || "<unknown>",
				todayWeather: infoMap.get("todayWeather")?.description || "<unknown>",
				high: `${infoMap.get("high") || "<unknown>"}${unitSuffixes[unitArg || "metric"]?.temperature}`,
				low: `${infoMap.get("low") || "<unknown>"}${unitSuffixes[unitArg || "metric"]?.temperature}`,
			}),
		);

		return {
			success: true,
			messages: [
				{
					role: "tool",
					content: dedent`
                    The weather in ${pois[0]?.display_name} is currently ${formatMap.get("current")} and ${formatMap.get("currentWeather")}.
                    
                    Today, the weather is expected to be ${formatMap.get("todayWeather")}, with a high of ${formatMap.get("high")} and a low of ${formatMap.get("low")}.
                    `,
				},
			],
			data: {
				buttonUrl: `https://www.yr.no/en/forecast/daily-table/${pois[0]?.lat},${pois[0]?.lon}`,
				buttonText: `Weather (yr.no): ${pois[0]?.display_name}`.slice(0, 70),
			},
		};
	}
}
