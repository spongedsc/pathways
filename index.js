import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';

import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import fetch from 'node-fetch';

import { MsEdgeTTS } from "msedge-tts";

import * as dotenv from 'dotenv'

dotenv.config()

const channels = process.env.CHANNELIDS.split(",");

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

const character = fs.readFileSync('./character.txt', 'utf8').replace("\n", ' ');

const initialHistory = [
  { role: "system", content: character },
  { role: "user", content: "lily (she/her) on May 14, 2024 at 12:55 AM UTC: hi sponge" },
  { role: "assistant", content: "hi lily! how are you today :3" }
];
let lastMessage = "";
let history = initialHistory;

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!shouldIReply(message)) return;

  try {
    message.channel.sendTyping();

    // Conversation reset
    if (message.content.startsWith("%reset")) {
      history = initialHistory;
      message.reply(`♻️ Conversation history reset.`);
      return;
    }

    if (message.content.startsWith("%readback")) {
      message.reply(`\`${lastMessage}\``);
      return;
    }

    const imageDetails = await imageRecognition(message)

    // Send message to CharacterAI
    let formattedUserMessage = `${message.author.username} (${await getPronouns(message.author.id)}) on ${DateTime.now().setZone('utc').toLocaleString(DateTime.DATETIME_FULL)}: ${message.content}\n${imageDetails}`;
    if (message.reference) {
      await message.fetchReference().then(async (reply) => {
        if (reply.author.id == client.user.id) {
          formattedUserMessage = `> ${reply}\n${formattedUserMessage}`;
        } else {
          formattedUserMessage = `> ${reply.author.username}: ${reply}\n${formattedUserMessage}`;
        }
      });
    };
    lastMessage = formattedUserMessage;

    message.channel.sendTyping();
    history.push({ role: "user", content: formattedUserMessage });
    const input = {
      messages: history,
      max_tokens: 512,
    };
    let response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/ai/run/@cf/meta/llama-3-8b-instruct`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    response = await response.json();
    response = response.result.response
    history.push({ role: "assistant", content: response });
    if (history.length > 14) {
      history.shift();
      history.shift();
      history.push({ role: "system", content: `System Reminder: ${character}` },);
    }

    if (response == "") return message.reply(`❌ AI returned an empty response! Yell at someone idk.`);

    let parts = response.split("!gen");

    let trimmedResponse = parts[0].trim();

    // Handle long responses
    if (trimmedResponse.length >= 2000) {
      fs.writeFileSync(path.resolve('./temp/how.txt'), trimmedResponse);
      message.reply({ content: "", files: ["./temp/how.txt"], failIfNotExists: false });
      return;
    }

    // Send AI response
    let sentMessage
    try {
      sentMessage = await message.reply({ content: `${trimmedResponse}`, failIfNotExists: true });
    } catch (e) {
      console.log(e);
      sentMessage = await message.channel.send({ content: `\`\`\`\n${message.author.username}: ${message.content}\n\`\`\`\n\n${trimmedResponse}` });
    }
    if (response.includes("!gen")) {
      selfImageGen(message, response, sentMessage);
    }

    // tts!
    if (message.member.voice.channel) {
      tts(message, trimmedResponse);
    }
  } catch (error) {
    console.error(error);
    return message.reply(`❌ Error! Yell at arti.`);
  }
});

async function imageRecognition(message) {
  if (message.attachments.size > 0) {
    let imageDetails = '';

    const res = await fetch(message.attachments.first().url);
    const blob = await res.arrayBuffer();
    const input = {
      image: [...new Uint8Array(blob)],
      prompt: "Generate a caption for this image",
      max_tokens: 256,
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

async function selfImageGen(message, response, sentMessage) {
  let parts = response.split("!gen");

  let partBeforeGen = parts[0].trim();
  let partAfterGen = parts[1].trim().replace('[', '').replace(']', '');

  try {
    let response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/ai/run/@cf/lykon/dreamshaper-8-lcm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CF_TOKEN}`,
      },
      body: JSON.stringify({
        prompt: partAfterGen
      })
    });
    response = await response.arrayBuffer();
    const imageBuffer = Buffer.from(response);
    sentMessage.edit({ content: partBeforeGen, files: [imageBuffer] });
  } catch (error) {
    console.error(error);
    return message.reply(`❌ Error in image generation! Try again later.`);
  };
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
