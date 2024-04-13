import { Client, GatewayIntentBits } from 'discord.js'

import fs from 'fs'
import path from 'path';

import { io } from "socket.io-client";
import CharacterAI from 'node_characterai';
import locateChrome from 'locate-chrome';

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

const characterAI = new CharacterAI();
characterAI.requester.puppeteerPath = await new Promise(resolve => locateChrome((arg) => resolve(arg))) || '';
await characterAI.authenticateWithToken(process.env.CHARACTERAI_TOKEN);

// Map to store the last message timestamp per person
const cooldowns = new Map();

client.on("ready", async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  client.user.setActivity(`uwu`);
});

function shouldIReply(message) {
  if (message.author.id == client.user.id) return false;
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


client.on("messageCreate", async message => {
  if (!shouldIReply(message)) return;

  try {
    if (backendsocket.disconnected && message.attachments.size > 0) message.channel.send(`🔕 Backend socket is not connected. Image recognition is disabled.`);
    const chat = await characterAI.createOrContinueChat(process.env.CHARACTER_ID);
    message.channel.sendTyping();

    // Conversation reset
    if (message.content.startsWith("%reset")) {
      chat.saveAndStartNewChat()
      message.reply(`♻️ Conversation history reset.`);
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
    let response;
    let formattedUserMessage;
    if (message.reference) {
      await message.fetchReference().then((reply) => {
        formattedUserMessage = `> ${reply}\n${message.author.displayName}: ${message.content}\n${imageDetails}`;
      });
    } else {
      formattedUserMessage = `${message.author.displayName}: ${message.content}\n${imageDetails}`;
    }

    message.channel.sendTyping();
    response = await chat.sendAndAwaitResponse(formattedUserMessage, true);

    // Handle long responses
    if (response.text.length >= 2000) {
      fs.writeFileSync(path.resolve('./how.txt'), response.text);
      message.reply({ content: "", files: ["./how.txt"], failIfNotExists: false });
      return;
    }

    // Send AI response
    message.reply({ content: `${response.text}`, failIfNotExists: false });
  } catch (error) {
    console.error(error);
    return message.reply(`❌ Error! Yell at arti.`);
  }
});

client.login(process.env.DISCORD);