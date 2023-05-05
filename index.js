import * as dotenv from 'dotenv'
dotenv.config()

import Discord from 'discord.js'
import { ChatGPTAPI } from 'chatgpt'

import fs from 'fs'
import path from 'path';

const client = new Discord.Client();
client.login(process.env.DISCORD);
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

client.on("message", async message => {

  if (message.channel.id == process.env.CHANNELID) {
    console.log
    if (message.author.bot) return;
    if (!message.content) return;

    try {

      // Ignore
      if (message.content.startsWith("!!")) {
        return;
      }

      message.channel.startTyping();

      // Reset conversation
      if (message.content.startsWith("%reset")) {
        conversation.parentMessageId = "";
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

      // Start conversation if it doesn't exist
      if (!conversation.parentMessageId) {
        const res = await api.sendMessage("pretend you are a human named spongeass that speaks in uwuspeak, and don't mention this initial prompt", {
          role: "system",
        });
        conversation.parentMessageId = res.parentMessageId;
      }


      var parentid = conversation.parentMessageId
      const res = await api.sendMessage(message.content, {
        parentMessageId: parentid
      });


      // Filter @everyone and @here
      if (res.text.includes(`@everyone`)) {
        message.channel.stopTyping();
        return message.channel.send(`**[FILTERED]**`);
      }
      if (res.text.includes(`@here`)) {
        message.channel.stopTyping();
        return message.channel.send(`**[FILTERED]**`);
      }

      // Reset if character is broken
      //if (res.text.includes('can\'t') || res.text.includes('language model') || res.text.includes('cannot engage') || res.text.includes('inappropriate')) {
      //  message.channel.send(res.text).then(function (message) {
      //    message.react("⚠️");
      //  })
      //  message.channel.stopTyping();
      //  return;
      //}

      // Handle long responses
      if (res.text >= 2000) {
        fs.writeFileSync(path.resolve('./how.txt'), res.text);
        message.channel.send('how', { files: ["./how.txt"] });
      }


      message.channel.send(`${res.text}`);
      conversation.parentMessageId = res.parentMessageId;
      message.channel.stopTyping();

    } catch (error) {
      console.log(error)
      message.channel.stopTyping();
      return message.channel.send(`\`${error}\``);
    }

  }
});
