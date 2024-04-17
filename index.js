import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';

import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import axios from 'axios';

import { io } from "socket.io-client";
import { MsEdgeTTS } from "msedge-tts";

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
    const response = await axios.get('/api/v2/lookup', {
      baseURL: 'https://pronoundb.org',
      params: {
        platform: 'discord',
        ids: userid
      }
    });

    let pronounsresponse = response.data;



    for (let userId in pronounsresponse) {
      if (pronounsresponse[userId].sets.hasOwnProperty('en')) {
        pronounsresponse[userId] = pronounsresponse[userId].sets['en'].join('/');
      } else {
        pronounsresponse[userId] = 'they/them';
      }
    }
    if (!pronounsresponse.hasOwnProperty(userid)) {
      pronounsresponse[userid] = 'they/them';
    }

    return pronounsresponse[userid];
  } catch (error) {
    console.error(error);
  }
}

let lastMessage = "";

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!shouldIReply(message)) return;

  try {
    if (backendsocket.disconnected) message.channel.send(`🔕 Backend socket is not connected. Try again later.`);
    message.channel.sendTyping();

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

    let imageDetails = '';
    if (message.attachments.size > 0 && !backendsocket.disconnected) {
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

    // Send message to CharacterAI
    let formattedUserMessage = `${message.author.username} (${await getPronouns(message.author.id)}) at ${DateTime.now().setZone('utc').toLocaleString(DateTime.DATETIME_FULL)}: ${message.content}\n${imageDetails}`;
    if (message.reference) {
      await message.fetchReference().then(async (reply) => {
        formattedUserMessage = `> ${reply}\n${formattedUserMessage}`;
      });
    };
    lastMessage = formattedUserMessage;

    let response;
    message.channel.sendTyping();
    const sendchat = new Promise((resolve) => {
      backendsocket.emit("chat", { "message": formattedUserMessage, "usellm": false }, (val) => {
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
    message.reply({ content: `${response}`, failIfNotExists: false });

    // tts!
    if (message.member.voice.channel) {
      tts(message, response);
    }
  } catch (error) {
    console.error(error);
    return message.reply(`❌ Error! Yell at arti.`);
  }
});

async function tts(message, text) {
  if (message.member.voice.channel) {
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
  } else {
    message.reply('You need to join a voice channel first!');
  }
}

client.login(process.env.DISCORD);