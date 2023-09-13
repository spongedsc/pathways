import * as dotenv from 'dotenv'
dotenv.config()

import Discord from 'discord.js'
import { ChatGPTAPI } from 'chatgpt'

import fs from 'fs'
import path from 'path';

import axios from 'axios';
import { decode } from 'html-entities';

const client = new Discord.Client();

client.on("ready", () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  client.user.setActivity(`uwu`);
});

let conversation = {
  parentMessageId: null
};

const api = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY
})


// For local streaming, the websockets are hosted without ssl - http://
const URI = `https://ai.arti.lol/api/v1/chat`;
let history = { internal: [], visible: [] };

// For reverse-proxied streaming, the remote will likely host with ssl - https://
// const URI = 'https://your-uri-here.trycloudflare.com/api/v1/chat';

async function sendChat(userInput, history) {
  const request = {
    user_input: userInput,
    max_new_tokens: 1000,
    auto_max_new_tokens: false,
    max_tokens_second: 0,
    history: history,
    mode: 'chat', // Valid options: 'chat', 'chat-instruct', 'instruct'
    character: 'SpongeAss',
    instruction_template: null, // Will get autodetected if unset
    your_name: 'discord user',
    // 'name1': 'name of user', // Optional
    // 'name2': 'name of character', // Optional
    // 'context': 'character context', // Optional
    // 'greeting': 'greeting', // Optional
    // 'name1_instruct': 'You', // Optional
    // 'name2_instruct': 'Assistant', // Optional
    // 'context_instruct': 'context_instruct', // Optional
    // 'turn_template': 'turn_template', // Optional
    regenerate: false,
    _continue: false,
    chat_instruct_command:
      'Continue the chat dialogue below. Write a single reply for the character "".\n\n',

    // Generation params. If 'preset' is set to different than 'None', the values
    // in presets/preset-name.yaml are used instead of the individual numbers.
    preset: 'None',
    do_sample: true,
    temperature: 1, // set to 1 for extra fun!!! weeeee (0.7 is default)
    top_p: 0.1,
    typical_p: 1,
    epsilon_cutoff: 0, // In units of 1e-4
    eta_cutoff: 0, // In units of 1e-4
    tfs: 1,
    top_a: 0,
    repetition_penalty: 1.18,
    repetition_penalty_range: 0,
    top_k: 40,
    min_length: 0,
    no_repeat_ngram_size: 0,
    num_beams: 1,
    penalty_alpha: 0,
    length_penalty: 1,
    early_stopping: false,
    mirostat_mode: 0,
    mirostat_tau: 5,
    mirostat_eta: 0.1,
    guidance_scale: 1,
    negative_prompt: '',

    seed: -1,
    add_bos_token: true,
    truncation_length: 2048,
    ban_eos_token: false,
    skip_special_tokens: true,
    stopping_strings: [],
  };

  try {
    const response = await axios.post(URI, request);

    if (response.status === 200) {
      const result = response.data.results[0].history;

      console.log(JSON.stringify(result, null, 4));
      console.log(decode(result.visible[result.visible.length - 1][1]));
      return decode(result.visible[result.visible.length - 1][1]);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Basic example

// "Continue" example. Make sure to set '_continue' to true above
// const arr = [userInput, 'Surely, here is'];
// const history = { internal: [arr], visible: [arr] };


client.on("message", async message => {

  if (message.channel.id == process.env.CHANNELID) {
    if (message.author.bot) return;
    if (!message.content) return;

    try {

      // Ignore messages starting with !!
      if (message.content.startsWith("!!")) {
        return;
      }

      message.channel.startTyping();

      // Reset conversation
      if (message.content.startsWith("%reset")) {
        conversation.parentMessageId = null;
        message.channel.send("Conversation reset.");
        message.channel.stopTyping();
        return;
      }
      // Print conversation ID and parent message ID
      if (message.content.startsWith("%debug")) {
        message.channel.send("parentMessageId: " + conversation.parentMessageId);
        message.channel.stopTyping();
        return;
      }

      let res = await sendChat(message.content, history);


      // Filter @everyone and @here
      if (res.includes(`@everyone`)) {
        message.channel.stopTyping();
        return message.channel.send(`**[FILTERED]**`);
      }
      if (res.includes(`@here`)) {
        message.channel.stopTyping();
        return message.channel.send(`**[FILTERED]**`);
      }

      // Handle long responses
      if (res.length >= 2000) {
        fs.writeFileSync(path.resolve('./how.txt'), res);
        message.channel.send('', { files: ["./how.txt"] });
        message.channel.stopTyping();
        return;
      }


      message.channel.send(`${res}`);
      message.channel.stopTyping();

    } catch (error) {
      console.log(error)
      message.channel.stopTyping();
      return message.channel.send(`\`${error}\``);
    }

  }
});

client.login(process.env.DISCORD);
