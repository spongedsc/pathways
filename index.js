import { Client, GatewayIntentBits } from 'discord.js'

import fs from 'fs'
import path from 'path';

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

// Map to store the last message timestamp per person
const cooldowns = new Map();

client.on("ready", async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  client.user.setActivity(`uwu`);
});


client.on("messageCreate", async message => {
  if (message.author.id == client.user.id) return;
  if (!message.content && !message.attachments) return;

  if (Math.random() < process.env.REPLY_CHANCE && !channels.includes(message.channel.id)) return;

  if (message.content.startsWith("!!")) return;

  // Check cooldown for the person who sent the message
  const lastMessageTime = cooldowns.get(message.author.id);
  if (lastMessageTime && Date.now() - lastMessageTime < 1000) {
    return; // Ignore the message if the cooldown hasn't expired
  }

  try {
    if (backendsocket.disconnected) return message.reply(`🔕 Backend socket is not connected. This shouldn't happen! Yell at arti.`);
    message.channel.sendTyping();

    // Conversation reset
    if (message.content.startsWith("%reset")) {
      backendsocket.emit("newchat", null);
      message.reply(`♻️ Conversation history reset.`);
      return;
    }

    // Update the last message timestamp for the person
    cooldowns.set(message.author.id, Date.now());

    let imageDetails = '';
    if (message.attachments.size > 0) {
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

    if (message.content.includes("@3")) {
      formattedUserMessage = formattedUserMessage.replace("@3", "")
    }

    const promise = new Promise((resolve) => {
      backendsocket.emit("chat", { "message": formattedUserMessage, "usellm": message.content.includes("@3") }, (val) => {
        response = val;
        resolve();
      });
    });
    await promise;

    // Handle long responses
    if (response.length >= 2000) {
      fs.writeFileSync(path.resolve('./how.txt'), response);
      message.reply({ content: "", files: ["./how.txt"], failIfNotExists: false });
      return;
    }

    // Send AI response
    message.reply({ content: `${response}`, failIfNotExists: false });
  } catch (error) {
    console.error(error);
    return message.reply(`❌ Error! Yell at arti.`);
  }

});

client.login(process.env.DISCORD);