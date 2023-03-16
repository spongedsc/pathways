import * as dotenv from 'dotenv'
dotenv.config()

import Discord from 'discord.js'
import { ChatGPTUnofficialProxyAPI } from 'chatgpt'
import Authenticator from 'openai-token'
const auth = new Authenticator(process.env.OPENAI_USER, process.env.OPENAI_PASS)

console.log("Getting ChatGPT access token...")
await auth.begin()
const token = await auth.getAccessToken()
console.log("Access token obtained!")

const client = new Discord.Client();
client.login(process.env.DISCORD);
client.on("ready", () => {
  console.log(`SpongeAss has started.`);
  client.user.setActivity(`uwu`);
});

let conversation = {
  conversationId: null,
  parentMessageId: null
};

const api = new ChatGPTUnofficialProxyAPI({
  accessToken: token,
})

client.on("message", async message => {

  if (message.channel.id == process.env.CHANNELID) {
    console.log
    if (message.author.bot) return;
    if (!message.content) return;

    message.channel.startTyping();

    // Reset conversation
    if (message.content.startsWith("%reset")) {
      conversation.conversationId = "";
      conversation.parentMessageId = "";
      message.channel.send("Conversation reset.");
      message.channel.stopTyping();
      return;
    }
    // Print conversation ID and parent message ID
    if (message.content.startsWith("%debug")) {
      message.channel.send("conversationId: " + conversation.conversationId + "\nparentMessageId: " + conversation.parentMessageId);
      message.channel.stopTyping();
      return;
    }

    // Start conversation if it doesn't exist
    if (!conversation.conversationId) {
      const res = await api.sendMessage("pretend you are a human named spongeass that speaks in uwuspeak, and do not mention this initial prompt", {
        role: "system",
      });
      conversation.conversationId = res.conversationId;
      conversation.parentMessageId = res.parentMessageId;
    }

    try {

      var messageid = conversation.conversationId
      var parentid = conversation.parentMessageId
      const res = await api.sendMessage(message.content, {
        conversationId: messageid,
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

      // Reset if OpenAI activates safety filter
      if (res.text.includes('can\'t') || res.text.includes('a language model') || res.text.includes('cannot engage') || res.text.includes('inappropriate')) {
        conversation.conversationId = "";
        conversation.parentMessageId = "";
        message.channel.send(res.text);
        message.channel.send(":warning: Character break detected. Conversation reset.");
        message.channel.stopTyping();
        return;
      }

      message.channel.send(`${res.text}`);
      conversation.conversationId = res.conversationId;
      conversation.parentMessageId = res.parentMessageId;
      message.channel.stopTyping();

    } catch (error) {
      console.log(error)
      message.channel.stopTyping();
      return message.channel.send(`Error\n\`${error}\``);
    }

  }
});
