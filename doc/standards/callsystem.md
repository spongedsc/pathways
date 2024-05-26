# Callsystems
For more information on what Callsystems are and why this standard exists, visit the GitHub issue for [the Callsystems RFC](https://github.com/spongedsc/pathways/issues/77).

## Interfaces
### Callsystem
```js
class Callsystem {
    constructor({ env, message, client, defaultModel, defaultProvider }) {
        this.env = env;
		this.client = client;
		this.message = message;
		this.defaultModel = defaultModel;
		this.defaultProvider = defaultProvider;
        this.std = new CallsystemStd();
        this.provider = new WorkersAI();
    }
    
    static get packageId() {}
    static get name() {}
    static get version() {}
    static get releaseDate() {}
    static get capabilities() {}
    async activate() {}
}
```
The base class for all callsystems. Extend this class to create a callsystem.

#### Static getters
##### `packageId()` -> `String`
The package ID of the callsystem. Package IDs are used to identify the callsystem internally.

The package ID can be any string, but we recommend using a namespaced format (e.g. "cs.example.mycallsystem").

##### `name()` -> `String`
The human-readable name. This is used in the logger and when switching the callsystem on the fly.

##### `version()` -> `String`
This is the version of the callsystem. This value is used to organise multiple versions of the same callsystem when a callsystem with versioning is used.

##### `releaseDate()` -> `Date`
This is the release date of the callsystem. This value is used to sort the callsystems with versioning in order to satisfy the specification's requirement of flexible versioning schemes.

If the release date is not specified, Core will use the current date.

##### `capabilities()` -> `CallsystemCapabilities[]`
An array of capabilities that the callsystem supports. Valid capabilities are listed in the [CallsystemCapabilities](#callsystemcapabilities) enum.


##### `managerOptions()` -> `object`
An object containing any options that should be passed to the callsystem's manager. This is useful for passing options such as a custom template for passive activation history. 

The default value is an empty object and does not need to be specified if no options are required. Don't worry about this if you don't need to pass/override any options or if you're not using CallsystemStd.

#### Instance methods
##### `activate()` -> `Promise<CallsystemActivationResponse>`
The main lifecycle function for the callsystem. Model calls and context should be handled here.

### CallsystemStd
```js
class CallsystemStd {
    constructor({ callsystemName, callsystemOptions, managerOptions }) {
        this.callsystem = callsystemName;
        this.services = {}; // Stores services (i.e. kv, logview, modelInteractions)
        this.managers = {}; // Stores managers included in std (i.e. history)
    }
    
    get kv() {} // => RedisClient
    get logview() {} // => Logview
    get modelInteractions() {} // => ModelInteractions
    get history() {} // => HistoryManager
    
    static conditions(message, env) {} // => boolean
    responseTransform({ content, files }) {} // => object
    log({ message, level = "default" }) {} // => void
}
```
`CallsystemStd` provides a standard library of helper functions and accessors for developing a callsystem. Standard library functions are conformant to the standards listed in this document.

Usage of `CallsystemStd` is not required, but it is highly recommended for stability and consistency.

#### Static methods
##### `conditions(message, env)` -> `boolean`
This method is used by the `messageCreate` event to determine whether or not the message meets the conditions for passive activation.

This method should not be used as the callsystem's activation presumes that `conditions` returns `true`, but the method is exposed for convenience.

#### Instance getters
##### `kv` -> `RedisClient`
Returns the Redis client used by the callsystem. In most cases, this is equivalent to `client.kv`, where history and preferences are stored.

Unlike in some other applications, Pathways uses Redis as a persistent key-value database. This is because Redis has native support for JSON and Lists through modules, which is useful for storing everything in a flexible format.

##### `logview` -> `Logview`
The default Logview client exposed by CallsystemStd. This is used to upload logs to the web interface.

##### `modelInteractions` -> `ModelInteractions`
> [!WARNING]
> `ModelInteractions` is an API that is intended to be used by Legacy **only**. Public use of this API will be deprecated in a future release.

CallsystemStd exposes an instance of ModelInteractions, a Legacy-era API for interacting with history, interaction helpers, and other model-related functionality.

##### `history` -> `HistoryManager`
HistoryManager is an API for managing the history of a callsystem.

#### Instance methods
##### `responseTransform({ content, files })` -> `object`
Transforms the desired response and file attachments into a standardised format and output.

##### `log({ message, level = "default" })` -> `void`
Forwards a message to the logger. You should use this method as the logger function instead of `console.log`.

**ModelInteractions is not well-documented**. Proceed with using this API at your own risk.

## Types
### CallsystemCapabilities
```ts
enum CallsystemCapabilities {
    "text",
    "vision",
    "image",
    "ears",
    "audio",
    "tools",
    "legacy"
}
```

A list of valid capabilities for a callsystem. This is used to determine what the callsystem can do.

- `text` - Text generation
- `vision` - Image classification
- `image` - Image generation
- `ears` - Audio transcription
- `audio` - Audio generation
- `tools` - Tool calls and function calling
- `legacy` - All capabilities enabled; this should not be used and is only included for the Legacy callsystem

### CallsystemActivationResponse
```ts
interface CallsystemActivationResponse {
    success: boolean;
    summary?: string;
    context?: object;
}
```

The response to a callsystem activation request.

- `success` - Whether the activation was successful
- `summary` - A brief summary of any information that needs to be known about the activation
- `context` - A context object that can be used to store any additional data (i.e. message/user ID)
