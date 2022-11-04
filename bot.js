require('dotenv').config();
const Discord = require("discord.js");
const fs = require('fs');
const axios = require('axios');
const mergeImg = require('merge-img');
const Jimp = require('jimp');
const isCraiyonChannel = require('./channel-id-manager').isCraiyonChannel;
const addNewCraiyonChannel = require('./channel-id-manager').addNewCraiyonChannel;
const sharp = require('sharp');


const CRAIYON_URL = 'https://backend.craiyon.com/generate';

const SET_CHANNEL_CMD = 'here';


function getPayload(promptText) {
  return {
    prompt: promptText
  };
}

function getImgBuffer(img1) {

  let outputBuffer = null;

  img1.getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
    if (err) {
      console.log(err);
    }
    outputBuffer = buffer;
  });
  return outputBuffer;
}

function isSelf(msg) {
  return msg.author.id === client.user.id;
}


function isSelfTagged(msg) {
  if (msg.mentions) {
    return msg.mentions.users.has(client.user.id);
  }
}


async function getCraiyonResponse(prompt) {

  let result;
  let attempts = 0;

  console.log(`prompt ${prompt}`);

  while (attempts < 3 && !result) {
    try {
      console.log('awaiting response from craiyon');
      attempts += 1;
      console.log(`attempt #${attempts}`);
      await axios.post(CRAIYON_URL, getPayload(prompt)).then((res) => {
        console.log(`got response: ${res.status}`);
        if (res && res.data) {
          result = res.data;
        }
      }).catch((error) => {
        console.log(`got error on attempt #${attempts}`);
        console.log(error);
      });

    }
    catch (error) {
      console.log(error);
    }
  }

  return result;

}

async function handleResponseFromCraiyon(prompt, response) {

  if (!response) {
    return;
  }

  const images = response.images;

  let buffers = [];

  for (let i = 0; i < images.length; i++) {
    let image = images[i];
    image = image.split('\n').join('');
    const imageBuffer = Buffer.from(image, "base64");
    const processedBuffer = await sharp(imageBuffer).jpeg().toBuffer();
    buffers.push(processedBuffer);
  }

  const set1 = [
    buffers[0],
    buffers[1],
    buffers[2]
  ];

  const set2 = [
    buffers[3],
    buffers[4],
    buffers[5]
  ];

  const set3 = [
    buffers[6],
    buffers[7],
    buffers[8]
  ];

  const options = {
    offset: 7
  };

  const img1 = await mergeImg(set1, options);
  const img2 = await mergeImg(set2, options);
  const img3 = await mergeImg(set3, options);


  const final = await mergeImg([
    getImgBuffer(img1),
    getImgBuffer(img2),
    getImgBuffer(img3)
  ], {
    offset: 7,
    direction: true
  });

  const finalBuffer = getImgBuffer(final);
  return finalBuffer;
  // console.log(`writing file to ${outputFileName}`);
  // fs.writeFileSync(outputFileName, finalBuffer);

  // return outputFileName;

}

function getProcessedMessageContent(msg) {

  let msgContent = msg.content.replace(/[\\<>@#&!]/g, "");

  if (msg.mentions) {
    msg.mentions.users.forEach((user) => {
      const join = (user.id === client.user.id) ? '' : user.username;
      msgContent = msgContent.split(user.id).join(join);
    });
  }

  msgContent = msgContent.trim();
  return msgContent;
}

async function sendCraiyonGeneration(content, channel, captionMessage) {
  const response = await getCraiyonResponse(content);

  if (!response) {
    channel.send({
      embeds: [
        {
          description: `Unable to generate: ${content}`
        }
      ]
    });
  }
  const output = await handleResponseFromCraiyon(content, response);
  if (!output) {
    return;
  }
  const attachment = new Discord.AttachmentBuilder(output);
  const embed = {
    description: captionMessage,
    fields: [
      {
        name: 'Craiyon Prompt',
        value: content
      }
    ]
  };

  channel.send({
    embeds: [embed],
    files: [attachment]
  }).catch((error) => {
    console.log(error);
  });
}

async function respondToMessageWithCraiyonGeneration(msg) {
  const processedContent = getProcessedMessageContent(msg);
  console.log('executing request on: ' + processedContent);
  msg.reply('workin on it - gimme a sec')
  sendCraiyonGeneration(processedContent, msg.channel, `\"${processedContent}\"`).catch((error) => {
    console.log(error);
  });
}

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMessageReactions,
    Discord.GatewayIntentBits.DirectMessageReactions,
    Discord.GatewayIntentBits.GuildEmojisAndStickers
  ]
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async msg => {
  try {

    if (!isSelf(msg)) {
      if (isSelfTagged(msg)) {
        if (isCraiyonChannel(msg)) {
          respondToMessageWithCraiyonGeneration(msg);
        }
        else {
          const processed = getProcessedMessageContent(msg);
          if(processed.toLowerCase() == SET_CHANNEL_CMD){
            addNewCraiyonChannel(msg.channel);
            msg.reply('All set - if you tag me in this channel I will make an image from your message.');
          }
          else{
            msg.reply(`If you want me to generate images in this channel - tag me in a message and type \"${SET_CHANNEL_CMD}\"`);
          }
        }
      }
    }
  }
  catch (error) {
    console.log(error);
  }
});

// client.on('messageReactionAdd', async (reaction, user) => {
//   console.log(`got reaction:  ${reaction.emoji} from user: ${user.username}`);

// });

client.login(process.env.DISCORD_TOKEN);