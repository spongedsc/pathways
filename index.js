import * as dotenv from 'dotenv'
dotenv.config()

import { Client, GatewayIntentBits } from 'discord.js'
import { ChatGPTAPI } from 'chatgpt'

import fs from 'fs'
import path from 'path';

import axios from 'axios';
import { decode } from 'html-entities';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on("ready", async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  client.user.setActivity(`uwu`);
  await client.channels.fetch(process.env.CHANNELID);
});

let conversation = {
  parentMessageId: null
};

let history = { internal: [], visible: [] };

const api = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY
});

async function sendChat(userInput, history) {
  const request = {
    user_input: userInput,
    max_new_tokens: 500,
    auto_max_new_tokens: false,
    max_tokens_second: 0,
    history: history,
    mode: 'chat',
    character: 'SpongeAss2',
    your_name: 'discord user',
    regenerate: false,
    _continue: false,
    chat_instruct_command:
      'Continue the chat dialogue below. Write a single reply for the character "".\n\n',

    preset: 'None',
    do_sample: true,
    temperature: 1, // set to 1 for extra fun!!! weeeee (0.7 is default)
    top_p: 0.1,
    typical_p: 1,
    epsilon_cutoff: 0,
    eta_cutoff: 0,
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
    const response = await axios.post(process.env.LOCAL_AI_URL, request);

    if (response.status === 200) {
      const result = response.data.results[0].history;

      // Combine the existing history with the new visibleHistory
      history.internal = result.internal;
      history.visible = result.visible;

      return decode(result.visible[result.visible.length - 1][1]);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

let localAIenabled = false;

async function makeRequest() {
  try {
    const response = await axios.get(process.env.LOCAL_AI_URL);

    if (response.status === 200) {
      localAIenabled = true;
    }
  } catch (error) {
    if (error.response.status === 404) {
      localAIenabled = true;
      return;
    };
    console.log(`\nCannot access local AI: Falling back to OpenAI API (non 404 code)\n`);
    localAIenabled = false;
  }
};


async function checkLocalAI() {
  let localAIenabledprev = localAIenabled;

  // Set a 20-second timeout
  const timeoutId = setTimeout(() => {
    localAIenabled = false;
    console.log(`\nCannot access local AI: Falling back to OpenAI API (timeout)\n`);
  }, 20000);

  await makeRequest()
    .then(() => {
      clearTimeout(timeoutId);
    })
    .catch((error) => {
      console.error('Error in makeRequest:', error);
    });
  if (localAIenabledprev != localAIenabled) {
    if (localAIenabled) {
      //client.channels.cache.get(process.env.CHANNELID).send("🔌 SpongeGPT connected!");
    } else {
      //client.channels.cache.get(process.env.CHANNELID).send("🔌 SpongeGPT disconnected, now using ChatGPT.");
    }
  }
}

checkLocalAI();

// Check every minute if the local AI is enabled
setInterval(async () => {
  checkLocalAI();
}, 60000);

client.on("messageCreate", async message => {

  if (message.channel.id == process.env.CHANNELID) {
    if (message.author.bot) return;
    if (!message.content) return;

    try {

      // Ignore messages starting with !!
      if (message.content.startsWith("!!")) {
        return;
      }

      message.channel.sendTyping();

      // Reset conversation
      if (message.content.startsWith("%reset")) {
        if (localAIenabled) {
          history = { internal: [], visible: [] };

          message.reply("Conversation reset.");
          return;
        }
        conversation.parentMessageId = null;
        message.reply("Conversation reset.");
        return;
      }
      // Print conversation ID and parent message ID
      if (message.content.startsWith("%debug")) {
        message.reply("parentMessageId: " + conversation.parentMessageId);
        return;

      }

      let res;
      if (localAIenabled) {
        let chatResponse = await sendChat(`${message.author.username}: ${message.content}`, history);

        res = { text: chatResponse };
      } else {
        res = await api.sendMessage(message.content, {
          parentMessageId: conversation.parentMessageId
        });
      }


      // Filter @everyone and @here
      if (res.text.includes(`@everyone`) || res.text.includes(`@here`)) {
        return message.reply(`**[FILTERED]**`);
      }

      // Handle long responses
      if (res.text.length >= 2000) {
        fs.writeFileSync(path.resolve('./how.txt'), res.text);
        message.reply({ content: "", files: ["./how.txt"] });
        return;
      }


      message.reply(`${res.text}`);
      if (!localAIenabled) conversation.parentMessageId = res.parentMessageId

    } catch (error) {
      console.log(error);
      return message.reply(`Error! Yell at arti.`);
    }

  }
});

client.login(process.env.DISCORD);
