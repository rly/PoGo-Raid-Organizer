// Load up the discord.js library
const Discord = require("discord.js");

// Load library for manipulating dates and times
const moment = require('moment');

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

// info on GymHuntrBot
const gymHuntrbotChannelName = "huntrbot";
const gymHuntrbotName = "GymHuntrBot";

// note that the approved pokemon list is not stored in a database and resets whenever the bot restarts
var approvedPokemon = ['lugia', 'articuno', 'zapdos', 'moltres', 'tyranitar', 'mew', 'mewtwo', 'raiku', 'entei', 'suicune', 'ho-oh', 'celebi']; // lower case
const shortPokemonNames = [
    ['articuno', 'arti'],
    ['zapdos', 'zap'],
    ['moltres', 'molt'],
    ['tyranitar', 'ttar'],
    ['suicune', 'suic']
];

const shortLocNames = [
    ['princeton-university', 'pu'],
    ['princeton', 'pton'],
    ['carnegie', 'carn'],
    ['west-windsor', 'wwind'],
    ['plainsboro', 'pboro'],
    ['the-', ''],
    ['-the', ''],
    ['the', ''],
]; // note, as coded, this replaces only the first instance of [0] with [1]

const maxPokemonNameLength = 12;
const maxLocNameLength = 18;
const maxChannelNameLength = 50; // to prevent name too long error
const raidChannelSuffix = "__";
const raidChannelCheckInterval = 5 * 60 * 1000; // every 5 minutes
const raidChannelMaxInactivity = 120; // minutes
const raidChannelMaxTimeAfterRaid = 0; // minutes

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});


client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.
  
  // if gymhuntrbot posts in the huntrbot channel, process it here
  var gymHuntrbotId = client.users.find('username', gymHuntrbotName).id; // user id (global)
  if (message.author.bot && message.author.id === gymHuntrbotId && message.channel.name === gymHuntrbotChannelName && message.embeds[0]) {
    var pokemonName = message.embeds[0].description.split('\n')[1].toLowerCase();
    // only create a channel if the pokemon is approved
    if (approvedPokemon.includes(pokemonName)) {
      processGymHuntrbotMsg(message, message);
    }
  }
  
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if (message.author.bot) return;
  
  // Also good practice to ignore any message that does not start with our prefix, 
  // which is set in the configuration file.
  if (message.content.indexOf(config.prefix) !== 0) return;
  
  // Here we separate our "command" name, and our "arguments" for the command. 
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.split(/\s+/g);
  const command = args.shift().slice(config.prefix.length).toLowerCase();
  
  // Let's go with a few common example commands! Feel free to delete or change those.
  
  if (command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }
  
  if (command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
    // To get the "message" itself we join the `args` back into a string with spaces: 
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{}); 
    // And we get the bot to say the thing: 
    message.channel.send(sayMessage);
  }
  
  if (command === "purge") {
    if (!checkPermissionsManageChannel(message) || !checkPermissionsManageMessages(message)) return false;
    // This command removes all messages from all users in the channel, up to 100.
    // First message is the purge command.
    
    // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);
    
    // Ooooh nice, combined conditions. <3
    if (!deleteCount || deleteCount < 2 || deleteCount > 100)
      return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");
    
    // delete the specified number of messages, newest first. 
    message.channel.bulkDelete(deleteCount)
        .catch(error => message.reply(`I couldn't delete messages because of: ${error}`));
  }
  
  /*if (command === "createchannel") {
    await message.guild.createChannel(args[0], "text")
      .catch(error => message.reply(`Sorry ${message.author}, I couldn't create channel ${args[0]} because of : ${error}`));
    message.reply(`Channel ${args[0]} has been created by ${message.author.tag}`);
  }
  
  if (command === "deletechannel") {
    var channels = message.guild.channels;
    var ch = channels.find('name', args[0]);
    await ch.delete()
      .catch(error => message.reply(`Sorry ${message.author}, I couldn't delete because of : ${error}`));
    message.reply(`Channel ${args[0]}  has been deleted by ${message.author.tag}`);
  }*/
  
  // add a pokemon to the approved list for raid channel creation
  if (command === "approve") {
    if (!checkPermissionsManageChannel(message)) return false;
    
    for (var i = 0; i < args.length; i++) {
      if (approvedPokemon.includes(args[i].toLowerCase()))
        message.reply(`${args[i]} is already on my approved pokemon list for raid channel creation.`);
      else {
        approvedPokemon.push(args[i].toLowerCase());
        message.reply(`${args[i]} is now on my approved pokemon list for raid channel creation.`);
      }
    }
  }
  
  // remove a pokemon from the approved list for raid channel creation
  if (command === "disapprove") {
    if (!checkPermissionsManageChannel(message)) return false;
  
    for (var i = 0; i < args.length; i++) {
      if (!approvedPokemon.includes(args[i].toLowerCase()))
        message.reply(`${args[i]} is not on my approved pokemon list for raid channel creation.`);
      else {
        approvedPokemon.splice(approvedPokemon.indexOf(args[i]), 1);
        message.reply(`${args[i]} is now off my approved pokemon list for raid channel creation.`);
      }
    }
  }
  
  // list all approved pokemon for raid channel creation
  if (command === "list") {
    return message.reply(`My approved Pokemon list is: ${approvedPokemon}`);
  }
  
  // e.g. +raid lugia princeton-stadium 7:49pm
  if (command === "raid") {
    if (args.length != 3)
      return message.reply(`Sorry, that is the incorrect format. The format for creating a raid channel is "${config.prefix}raid pokemonName locationNoSpaces time", e.g. "${config.prefix}raid lugia princeton-stadium 7:49pm.`);
    
    // parse the input: pokemonName locationNoSpaces time
    var pokemonName = args[0];
    var loc = args[1];
    var raidTime = args[2];
    var pokemonNameCap = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1).toLowerCase();
    var locCap = loc.charAt(0).toUpperCase() + loc.slice(1);
    
    // check if pokemon is on approved list
    //if (!approvedPokemon.includes(pokemonName.toLowerCase()))
    //  return message.reply(`Sorry ${message.author}, ${args[0]} is not on my approved pokemon list for raid //channel creation.`);
    
    var shortPokemonName = pokemonName.toLowerCase();
    for (var i = 0; i < shortPokemonNames.length; i++) { // shorten pokemon names
      shortPokemonName = shortPokemonName.replace(shortPokemonNames[i][0], shortPokemonNames[i][1]);
    }
    shortPokemonName = shortPokemonName.substring(0, maxPokemonNameLength);
    var shortLoc = loc.toLowerCase().replace(/_/g, '-').replace(/[^\w-]/g, '');
    for (var i = 0; i < shortLocNames.length; i++) { // shorten location names
      shortLoc = shortLoc.replace(shortLocNames[i][0], shortLocNames[i][1]);
    }
    shortLoc = shortLoc.substring(0, maxLocNameLength);
    var raidTimeStr = raidTime.toLowerCase().replace(':', '-').replace(/[^\w-]/g, ''); // allowed variable length
    
    var newChannelName = shortPokemonName + "_" + shortLoc + "_" + raidTimeStr;
    newChannelName = newChannelName.substring(0, maxChannelNameLength - raidChannelSuffix.length) + raidChannelSuffix;
    
    // check for duplicates
    for (var [key, ch] of message.guild.channels) {
      if (ch.name === newChannelName) {
        console.log(`Tried to create channel ${newChannelName} but it already exists.`);
        return message.reply(`Channel <#${ch.id}> already exists.`);
      }
    }
    
    // create the channel and write a message
    await message.guild.createChannel(newChannelName, "text")
        .then(channel => {
          message.reply(`I created the channel <#${channel.id}>. Go there to coordinate a raid battle against **${pokemonNameCap}** at **${locCap}**! `);
          channel.send(`**${pokemonNameCap}** has appeared at **${locCap}**! You have until **${raidTime}**.\nPlease add a Google Maps link for the gym at ${locCap}.`);
          channel.setTopic(`Coordinate a raid versus ${pokemonNameCap} at ${locCap}! Ends at ${raidTime}.`);
          console.log(`Created channel #${channel.id} ${newChannelName}.`);
        })
        .catch(error => {
          message.reply(`Sorry ${message.author}, I couldn't create channel ${newChannelName} because of : ${error}`);
          console.log(`Couldn't create channel ${newChannelName} for ${message.author} because of : ${error}`);
        });
  }
  
  // delete all raid channels
  if (command === "deleteraids") {
    if (!checkPermissionsManageChannel(message)) return false;
    
    for (var [key, ch] of message.guild.channels) {
      if (ch.type === 'text' && ch.name.endsWith(raidChannelSuffix)) {
        await ch.delete()
            .catch(error => {
              message.reply(`Sorry ${message.author}, I couldn't delete ${ch.name} because of : ${error}`);
              console.log(`Couldn't delete raid channel <#${ch.id}> for ${message.author} because of : ${error}`);
            });
        message.reply(`Channel ${ch.name}  has been deleted`);
        console.log(`Channel ${ch.name}  has been deleted`);
      }
    }
  }
  
  // make a raid channel for the last GymHuntrBot raid for a pokemon on the approved list
  if (command === "raidlast") {
    var gymHuntrbotId = client.users.find('username', gymHuntrbotName).id; // user id (global)
    var gymHuntrbotChannel = message.guild.channels.find('name', gymHuntrbotChannelName);
    gymHuntrbotChannel.fetchMessages({limit: 100})
        .then(messages => {
          for (var [key, msg] of messages) {
            if (msg.author.id === gymHuntrbotId && msg.embeds[0]) {
              var pokemonName = msg.embeds[0].description.split('\n')[1].toLowerCase();
              // only create a channel if the pokemon is approved
              if (approvedPokemon.includes(pokemonName)) {
                processGymHuntrbotMsg(message, msg);
                break;
              }
            }
          }
        });
  }
});

// continuously check raid channels for inactivity
client.on('ready', (evt) => {
  checkRaidChannels();
  if (client.raidChannelCheckInterval)
    clearInterval(client.raidChannelCheckInterval);
  client.raidChannelCheckInterval = setInterval(checkRaidChannels, raidChannelCheckInterval);
});

function checkPermissionsManageChannel(message) {
  if (!message.channel.permissionsFor(message.member).has('MANAGE_CHANNELS')) {
    message.reply(`Sorry, you do not have permission to do this.`);
    return false;
  }
  return true;
}

function checkPermissionsManageMessages(message) {
  if (!message.channel.permissionsFor(message.member).has('MANAGE_MESSAGES')) {
    message.reply(`Sorry, you do not have permission to do this.`);
    return false;
  }
  return true;
}

// check raid channels for inactivity and delete them if inactive
async function checkRaidChannels() {
  console.log(`Monitoring ${client.channels.size} channels for raid channel inactivity...`);
  for (var [key, ch] of client.channels) { // all channels in all servers
    // Check if is a raid channel
    if (ch.type === 'text' && ch.name.endsWith(raidChannelSuffix)) {
      console.log(`\tChecking #${ch.name} ...`);
      // Check if the time is Y minutes after the raid end time
      var raidTimeStr = ch.name.substring(0, ch.name.length - raidChannelSuffix.length);
      raidTimeStr = raidTimeStr.substring(raidTimeStr.lastIndexOf('_') + 1);
      // use current date but set time (use format e.g. "11-30pm")
      raidTimeMoment = moment(moment().format('YYYYMMDD') + ' ' + raidTimeStr, 'YYYYMMDD h-mma', true);
      if (raidTimeMoment.isValid() && raidTimeMoment.isBefore(moment().add(raidChannelMaxTimeAfterRaid, 'minutes'))) {
        console.log(`\tDeleting raid channel ${ch.id}: ${ch.name} because it is \>=${raidChannelMaxTimeAfterRaid} min past the raid end time.`);
        return ch.delete()
            .catch(error => console.log(`\tCouldn't delete raid channel <#${ch.id}> because of : ${error}`));
      }
        
      // Check if the last message was > X minutes ago or is Y minutes after the raid time
      ch.fetchMessages({limit: 1})
          .then(messages => {
            messages.forEach(message => {
              var lastMsgDate = moment(message.createdAt);
              if (lastMsgDate.isBefore(moment().subtract(raidChannelMaxInactivity, 'minutes'))) {
                console.log(`\tDeleting raid channel ${ch.id}: ${ch.name} due to inactivity.`);
                ch.delete()
                    .catch(error => console.log(`\tCouldn't delete raid channel <#${ch.id}> because of : ${error}`));
              }
            });
          });
    }
  }
}

// process a GymHuntrBot message - create a new channel for coordinating the raid
async function processGymHuntrbotMsg(message, lastBotMessage) {
  var emb = lastBotMessage.embeds[0];
  
  // get the GPS coods and google maps URL
  var gpsCoords = new RegExp('^.*#(.*)','g').exec(emb.url)[1];
  var gmapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + gpsCoords;
  
  var descrip = emb.description;
  var parts = descrip.split('\n'); // location name is parts[0], name is parts[1], time left is parts[3]
    
  // extract the pokemon name
  var pokemonName = parts[1];
  var shortPokemonName = pokemonName.toLowerCase();
  for (var i = 0; i < shortPokemonNames.length; i++) { // shorten pokemon names
    shortPokemonName = shortPokemonName.replace(shortPokemonNames[i][0], shortPokemonNames[i][1]);
  }
  shortPokemonName = shortPokemonName.substring(0, maxPokemonNameLength);
  
  // clean up location name
  var loc = parts[0];
  var cleanLoc = loc.replace(/\*|\./g, ''); // remove bold asterisks and trailing .
  var shortLoc = loc.toLowerCase().replace(/\s|_/g, '-').replace(/[^\w-]/g, '');
  for (var i = 0; i < shortLocNames.length; i++) { // shorten location names
    shortLoc = shortLoc.replace(shortLocNames[i][0], shortLocNames[i][1]);
  }
  shortLoc = shortLoc.substring(0, maxLocNameLength);
  shortLoc = shortLoc.replace(/-/g, ' ').trim().replace(/\s/g, '-'); // trim trailing -
  
  // extract the time remaining and compute the end time
  // don't include seconds -- effectively round down
  const timeRegex = new RegExp(/\*Raid Ending: (\d+) hours (\d+) min \d+ sec\*/g);
  var raidTimeParts = timeRegex.exec(parts[3]);
  var raidTime = moment(lastBotMessage.createdAt).add(raidTimeParts[1], 'h').add(raidTimeParts[2], 'm');
  var raidTimeStr = raidTime.format('h-mma').toLowerCase();
  var raidTimeStrColon = raidTime.format('h:mma');
    
  // form the new channel name
  var newChannelName = shortPokemonName + "_" + shortLoc + "_" + raidTimeStr;
  newChannelName = newChannelName.substring(0, maxChannelNameLength - raidChannelSuffix.length) + raidChannelSuffix;
  
  // check for duplicates
  for (var [key, ch] of message.guild.channels) {
    if (ch.name == newChannelName) {
      console.log(`Tried to create channel ${newChannelName} but it already exists.`);
      return message.reply(`Channel <#${ch.id}> already exists.`);
    }
  }
  
  // create the channel and write a message
  await message.guild.createChannel(newChannelName, "text")
      .then(channel => {
        message.reply(`I created the temporary raid channel <#${channel.id}> (expires at ${raidTimeStrColon}). Go there to coordinate a raid battle against **${pokemonName}** at **${cleanLoc}**!`);
        channel.setTopic(`Coordinate a raid battle against ${pokemonName} at ${cleanLoc}! Ends at ${raidTimeStrColon}.`);
        console.log(`Created channel #${channel.id} ${newChannelName}.`);
        
        const newEmbed = new Discord.RichEmbed()
          .setDescription(`**${pokemonName}** has appeared at **${cleanLoc}**!\n\nYou have until **${raidTimeStrColon}**.\n\nGPS coords: **${gpsCoords}**\n[Open in Google Maps](${gmapsUrl}). Click image below to embiggen.`)
          .setThumbnail(`${emb.thumbnail.url}`)
          .setImage(`https://maps.googleapis.com/maps/api/staticmap?center=${gpsCoords}&zoom=15&scale=1&size=600x600&maptype=roadmap&key=${config.gmapsApiKey}&format=png&visual_refresh=true&markers=size:mid%7Ccolor:0xff0000%7Clabel:%7C${gpsCoords}`)
          .setColor(0x9b59b6);
        channel.send({embed: newEmbed});
      })
      .catch(error => {
        message.reply(`Sorry ${message.author}, I couldn't create channel ${newChannelName} because of : ${error}`);
        console.log(`Couldn't create channel ${newChannelName} for ${message.author} because of : ${error}`);
      });
}

client.login(config.token);
