const fs = require('fs');

const CHANNEL_IDS_FILE_PATH = `${process.cwd()}/channel_ids.txt`;

const CHANNEL_ID_SET = getChannelIdsSet();
console.log(`Channel IDs: ${CHANNEL_ID_SET.size}`);

function getChannelIdsSet(){
  return new Set(fs.readFileSync(CHANNEL_IDS_FILE_PATH).toString().split("\n"));
}

function isCraiyonChannel(msg) {
    return CHANNEL_ID_SET.has(msg.channelId)
}

function addNewCraiyonChannel(channel){
    CHANNEL_ID_SET.add(channel.id);
    let idStrBuffer = '';
    CHANNEL_ID_SET.forEach((id) => {
        idStrBuffer += id + "\n";
    });

    fs.writeFileSync(CHANNEL_IDS_FILE_PATH, idStrBuffer);
}

module.exports = {isCraiyonChannel, addNewCraiyonChannel};