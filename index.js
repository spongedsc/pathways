import * as dotenv from 'dotenv'
dotenv.config()

import Discord from 'discord.js'

import fs from 'fs'
import path from 'path';

import CharacterAI from 'node_characterai';

const client = new Discord.Client();
const characterAI = new CharacterAI();

(async () => {

  await characterAI.authenticateAsGuest();

  const characterId = process.env.CHARACTER_ID

  client.on("ready", () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    client.user.setActivity(`uwu`);
  });

  client.on("message", async message => {

    if (message.channel.id == process.env.CHANNELID) {
      console.log
      if (message.author.bot) return;
      if (!message.content) return;

      try {

        // Ignore messages starting with !!
        if (message.content.startsWith("!!")) {
          return;
        }

        message.channel.startTyping();

        const chat = await characterAI.createOrContinueChat(characterId);

        const res = await chat.sendAndAwaitResponse(message.content, true);


        // Filter @everyone and @here
        if (res.text.includes(`@everyone`)) {
          message.channel.stopTyping();
          return message.channel.send(`**[FILTERED]**`);
        }
        if (res.text.includes(`@here`)) {
          message.channel.stopTyping();
          return message.channel.send(`**[FILTERED]**`);
        }

        // Handle long responses
        if (res.text.length >= 2000) {
          fs.writeFileSync(path.resolve('./how.txt'), res.text);
          message.channel.send('how', { files: ["./how.txt"] });
          message.channel.stopTyping();
          return;
        }


        message.channel.send(`${res.text}`);

        message.channel.stopTyping();

      } catch (error) {
        console.log(error)
        message.channel.stopTyping();
        return message.channel.send(`\`${error}\``);
      }

    }
  });

})()
client.login(process.env.DISCORD);
