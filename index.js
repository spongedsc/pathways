import { Client, GatewayIntentBits } from 'discord.js'

import fs from 'fs'
import path from 'path';

import axios from 'axios';
import { decode } from 'html-entities';
import { io } from "socket.io-client";

import * as dotenv from 'dotenv'
dotenv.config()

const channels = process.env.CHANNELIDS.split(",");

const backendsocket = io(process.env.BACKEND_URL);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  allowedMentions: { parse: [], repliedUser: false }
});

client.on("ready", async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  client.user.setActivity(`uwu`);
});

let aiServer = 'spongeml';
let localHistory = { internal: [], visible: [] };

// Check every five minutes for text-generation-webui
setInterval(() => {
  checkTextGenWebUI();
}, 300000);

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content) return;

  if (!channels.includes(message.channel.id)) return;

  if (message.content.startsWith("!!")) return;

  try {
    message.channel.sendTyping();

    // Conversation reset
    if (message.content.startsWith("%reset")) {
      if (aiServer == "text-generation-webui") {
        localHistory = { internal: [], visible: [] };
        message.reply("♻️ Conversation history reset.");
      } else if (aiServer == "spongeml") {
        backendsocket.emit("newchat", null);
        message.reply("♻️ Conversation history reset.");
      } else {
        message.reply("Reset is not supported for this AI server.");
      }
      return;
    }

    let imageDetails = '';
    if (message.attachments.size > 0 && backendsocket.connected) {
      let promises = [];

      for (const attachment of message.attachments.values()) {
        try {
          const url = attachment.url;
          const promise = new Promise((resolve) => {
            message.channel.sendTyping();
            backendsocket.emit("imgcaption", url, (val) => {
              imageDetails += `Attached: image of ${val[0].generated_text}\n`;
              resolve();
            });
          });
          promises.push(promise);
        } catch (error) {
          console.error(error);
          return message.reply(`❌ Error! Yell at arti.`);
        };
      }

      message.channel.sendTyping();
      await Promise.all(promises);
    }

    // Send message to AI server
    let res;
    let formattedUserMessage;
    if (message.reference) {
      await message.fetchReference().then(async (reply) => {
        formattedUserMessage = `> ${reply}\n${message.author.username}: ${message.content}\n${imageDetails}`;
      });
    } else {
      formattedUserMessage = `${message.author.username}: ${message.content}\n${imageDetails}`;
    }
    message.channel.sendTyping();

    switch (aiServer) {
      case "text-generation-webui":
        res = { text: await textWebUIChat(formattedUserMessage, localHistory) };
        break;

      case "spongeml": {
        const promise = new Promise((resolve) => {
          backendsocket.emit("chat", message.content, (val) => {
            res = { text: val };
            resolve();
          });
        });
        await promise;
        break;
      }

      default:
        return message.reply(`No AI server available. (THIS SHOULD NOT HAPPEN)`);
    }


    // Handle long responses
    if (res.text.length >= 2000) {
      fs.writeFileSync(path.resolve('./how.txt'), res.text);
      message.reply({ content: "", files: ["./how.txt"] });
      return;
    }

    // Send AI response
    message.reply(`${res.text}`);

  } catch (error) {
    console.error(error);
    return message.reply(`❌ Error! Yell at arti.`);
  }

});

client.login(process.env.DISCORD);

async function textWebUIChat(userInput, history) {
  const request = {
    user_input: userInput,
    max_new_tokens: 200,
    auto_max_new_tokens: false,
    max_tokens_second: 0,
    history: history,
    mode: 'chat',
    character: 'SpongeAss-Bot',
    your_name: 'discord user',
    regenerate: false,
    _continue: false,
    chat_instruct_command:
      'Continue the chat dialogue below. Write a single reply for the character "<|character|>"\n\n<|prompt|>',
    preset: 'None',
    do_sample: true,
    temperature: 0.82,
    top_p: 0.21,
    typical_p: 1,
    epsilon_cutoff: 0,
    eta_cutoff: 0,
    tfs: 1,
    top_a: 0,
    repetition_penalty: 1.19,
    repetition_penalty_range: 0,
    top_k: 72,
    min_length: 0,
    no_repeat_ngram_size: 0,
    num_beams: 1,
    penalty_alpha: 0,
    length_penalty: 1,
    early_stopping: true,
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

async function checkTextGenWebUI() {
  async function makeRequest() {
    try {
      const response = await axios.get(process.env.LOCAL_AI_URL);

      if (response.status === 200) {
        aiServer = 'text-generation-webui';
      }
    } catch (error) {
      if (error.response.status === 404) {
        aiServer = 'text-generation-webui';
        return;
      };
      aiServer = 'spongeml';
    }
  };

  // Set a 20-second timeout
  const timeoutId = setTimeout(() => {
    aiServer = 'spongeml';
  }, 20000);

  await makeRequest()
    .then(() => {
      clearTimeout(timeoutId);
    })
    .catch((error) => {
      console.error('Error in makeRequest:', error);
    });
}