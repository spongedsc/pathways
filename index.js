import * as dotenv from 'dotenv'
dotenv.config()

import { Client, GatewayIntentBits } from 'discord.js'

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
  allowedMentions: { parse: [], repliedUser: false }
});

client.on("ready", async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  client.user.setActivity(`uwu`);
});

let history = { internal: [], visible: [] };


function saveMessage(subfolder, filename, text) {
  // Create the full path to the subfolder
  const subfolderPath = path.join(process.cwd(), subfolder);

  // Create the full path to the file within the subfolder
  const filePath = path.join(subfolderPath, filename);

  // Check if the subfolder exists, and create it if it doesn't
  if (!fs.existsSync(subfolderPath)) {
    fs.mkdirSync(subfolderPath, { recursive: true });
  }

  // Check if the file exists within the subfolder
  fs.access(filePath, (err) => {
    if (err) {
      // The file does not exist, so create it and append the text
      fs.writeFile(filePath, text + '\n', (err) => {
        if (err) {
          console.error('Error creating and writing to the file:', err);
        } else {
          console.log('File created and text appended successfully.');
        }
      });
    } else {
      // The file exists, so open it in append mode and append the text
      fs.appendFile(filePath, text + '\n', (err) => {
        if (err) {
          console.error('Error appending to the file:', err);
        } else {
          console.log('Text appended to the file successfully.');
        }
      });
    }
  });
}

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
    temperature: 1.99, // set to 1 for extra fun!!! weeeee (0.7 is default)
    top_p: 1,
    typical_p: 1,
    epsilon_cutoff: 0,
    eta_cutoff: 0,
    tfs: 1,
    top_a: 0,
    repetition_penalty: 3,
    repetition_penalty_range: 0,
    top_k: 200,
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
    console.log(`\nCannot access local AI (non 404 code)\n`);
    localAIenabled = false;
  }
};


async function checkLocalAI() {
  let localAIenabledprev = localAIenabled;

  // Set a 20-second timeout
  const timeoutId = setTimeout(() => {
    localAIenabled = false;
    console.log(`\nCannot access local AI (timeout)\n`);
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
      console.log("🔌 SpongeGPT connected!");
    } else {
      console.log("🔌 SpongeGPT disconnected.");
    }
  }
}

checkLocalAI();

// Check every minute if the local AI is enabled
setInterval(() => {
  checkLocalAI();
}, 60000);

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.content) return;

  const subfolderName = 'db';
  const filename = 'messages.txt';

  saveMessage(subfolderName, filename, message.content);

  if (message.channel.id == process.env.CHANNELID || message.channel.id == process.env.CHANNELID2) {

    try {

      // Ignore messages starting with !!
      if (message.content.startsWith("!!")) {
        return;
      }

      message.channel.sendTyping();

      // Reset conversation
      if (message.content.startsWith("%reset")) {
        history = { internal: [], visible: [] };
        message.reply("♻️ Conversation history reset.");
        return;
      }
      // Print conversation ID and parent message ID
      if (message.content.startsWith("%debug")) {
        message.reply("no debug info available");
        return;
      }

      let res;

      if (localAIenabled) {
        let chatResponse;
        if (message.reference) {
          await message.fetchReference().then(async (reply) => {
            chatResponse = await sendChat(`> ${reply}\n${message.author.username}: ${message.content}`, history);
          });
        } else {
          chatResponse = await sendChat(`${message.author.username}: ${message.content}`, history);
        }

        res = { text: chatResponse };
      } else {
        message.reply(`⚠️ SpongeGPT is currently unreachable, try again later!`);
        return;
      }

      // Handle long responses
      if (res.text.length >= 2000) {
        fs.writeFileSync(path.resolve('./how.txt'), res.text);
        message.reply({ content: "", files: ["./how.txt"] });
        return;
      }


      message.reply(`${res.text}`);
    } catch (error) {
      console.error(error);
      return message.reply(`❌ Error! Yell at arti.`);
    }

  }
});

client.login(process.env.DISCORD);
