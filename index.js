import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';

import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import fetch from 'node-fetch';

import { io } from "socket.io-client";
import { MsEdgeTTS } from "msedge-tts";

import * as dotenv from 'dotenv'

dotenv.config()

const channels = process.env.CHANNELIDS.split(",");

const backendsocket = io(process.env.BACKEND_URL, {
  transports: ['websocket']
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  allowedMentions: { parse: [], repliedUser: false }
});

backendsocket.on("connect_error", (err) => {
  console.error(`Error connecting to backend: ${err.message}`);
});

if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');

// Map to store the last message timestamp per person
const cooldowns = new Map();

client.on("ready", async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  client.user.setActivity(`uwu`);
});

function shouldIReply(message) {
  if (!message.content && !message.attachments) return false;
  if (Math.random() < process.env.REPLY_CHANCE && !channels.includes(message.channel.id) && !message.mentions.has(client.user.id)) return false;
  if (message.content.startsWith("!!")) return false;


  // Check cooldown for the person who sent the message
  const lastMessageTime = cooldowns.get(message.author.id);
  if (lastMessageTime && Date.now() - lastMessageTime < 1000) return false; // Ignore the message if the cooldown hasn't expired

  // Update the last message timestamp for the person
  cooldowns.set(message.author.id, Date.now());

  return true;
}

async function getPronouns(userid) {
  // this is spagetti i'm sorry
  try {
    let response = await fetch(`https://pronoundb.org/api/v2/lookup?platform=discord&ids=${userid}`);

    response = await response.json();


    for (let userId in response) {
      if (response[userId].sets.hasOwnProperty('en')) {
        response[userId] = response[userId].sets['en'].join('/');
      } else {
        response[userId] = 'they/them';
      }
    }
    if (!response.hasOwnProperty(userid)) {
      response[userid] = 'they/them';
    }

    return response[userid];
  } catch (error) {
    console.error(error);
  }
}

let lastMessage = "";
let enableLocal = false;

client.on("messageCreate", async message => {
  let content = message.content
  let msg_id = message.id;
  let author_un = message.author.username;
  if (message.author.bot) return;
  if (!shouldIReply(message)) return;

  try {
    if (backendsocket.disconnected) message.channel.send(`🔕 Backend is not connected. Try again later.`);
    message.channel.sendTyping();
    enableLocal = await checkLocal();

    // Conversation reset
    if (message.content.startsWith("%reset")) {
      backendsocket.emit("newchat", null);
      message.reply(`♻️ Conversation history reset.`);
      return;
    }

    if (message.content.startsWith("%readback")) {
      message.reply(`\`${lastMessage}\``);
      return;
    }

    let imageDetails = await imageRecognition(message)

    // Send message to CharacterAI
    let formattedUserMessage = `${message.author.username} (${await getPronouns(message.author.id)}) on ${DateTime.now().setZone('utc').toLocaleString(DateTime.DATETIME_FULL)}: ${message.content}\n${imageDetails}`;
    if (message.reference) {
      await message.fetchReference().then(async (reply) => {
        if (reply.author.id == "954288870244114473") {  // FIXME
          formattedUserMessage = `> ${reply}\n${formattedUserMessage}`;
        } else {
          formattedUserMessage = `> ${reply.author.username}: ${reply}\n${formattedUserMessage}`;
        }
      });
    };
    lastMessage = formattedUserMessage;

    let response;
    message.channel.sendTyping();
    const sendchat = new Promise((resolve) => {
      backendsocket.emit("chat", { "message": formattedUserMessage, "textgenwui": enableLocal }, (val) => {
        response = val;
        resolve();
      });
    });
    await sendchat;

    // Handle long responses
    if (response.length >= 2000) {
      fs.writeFileSync(path.resolve('./temp/how.txt'), response);
      message.reply({ content: "", files: ["./temp/how.txt"], failIfNotExists: false });
      return;
    }

    // Send AI response
    let no_longer_exists = false;
    try {
      message.channel.messages.fetch(message.id);
    } catch(e) {
      console.warn(e);
      no_longer_exists = true;
      message.reply({ content: `\`\`\`\n${author_un}: ${content}\n\`\`\`\n\n${response}`, failIfNotExists: false });
    }
    if (!no_longer_exists) {
      message.reply({ content: `${response}`, failIfNotExists: false });
    }

    // tts!
    if (message.member.voice.channel) {
      tts(message, response);
    }
  } catch (error) {
    console.error(error);
    return message.reply(`❌ Error! Yell at arti.`);
  }
});

async function checkLocal() {
  let response;
  const sendchat = new Promise((resolve) => {
    backendsocket.emit("localgenenabled", {}, (val) => {
      response = val;
      resolve();
    });
  });
  await sendchat;
  return response;
}

async function imageRecognition(message) {
  if (message.attachments.size > 0) {
    let imageDetails = '';

    const res = await fetch(message.attachments.first().url);
    const blob = await res.arrayBuffer();
    const input = {
      image: [...new Uint8Array(blob)],
      prompt: "Generate a caption for this image",
      max_tokens: 512,
    };

    try {
      let response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      });
      response = await response.json();

      imageDetails += `Attached: image of${String(response.result.description).toLowerCase()}\n`;
    } catch (error) {
      console.error(error);
      return message.reply(`❌ Error in image recognition! Try again later.`);
    };

    return imageDetails;
  } else {
    return '';
  }
}

async function tts(message, text) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata("en-US-AnaNeural", MsEdgeTTS.OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const filePath = await tts.toFile("./temp/audio.mp3", text);

  const channel = message.member.voice.channel;

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();
  const resource = createAudioResource(fs.createReadStream(filePath));

  connection.subscribe(player);
  player.play(resource);

  player.on('error', error => {
    console.error(`Audio Error: ${error.message}`);
  });
}

client.login(process.env.DISCORD);
