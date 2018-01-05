// Load up the discord.js library
const Discord = require("discord.js");

// Load library for manipulating dates and times
const moment = require('moment');

// Load library for making HTTP GET requests
const rp = require('request-promise');

// Load sqlite3 library
const sqlite3 = require("sqlite3").verbose();

// Load sqlite file of gym info generated elsewhere (requires columns "name", "latitude", "longitude"
const db = new sqlite3.Database('gymdetails');

// Create the main client object with methods to interface with Discord
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.
// config.gmapsApiKey contains the bot's Google Maps Static API key

var isCreateChannelOn = false;
var isAutoRaidChannelOn = false;
var isReplaceGymHuntrBotPost = true;
var isReplaceRaidBotPost = true;
var isPurgeEnabled = true;
var isMapImageEnabled = false;

const gmapsUrlBase = 'https://www.google.com/maps/search/?api=1&query=';
const gmapsState = 'NJ';

// info on GymHuntrBot
const gymHuntrbotName = "GymHuntrBot";

// info on GymHuntrBot
const huntrbotName = "HuntrBot";

// info on PokeAlarm Raid notification bot
const raidBotName1 = "Raid";
const raidBotName2 = "Egg";
const raidBotChannelName = "matinadesu-raid-bot";
const spawnPokeAlarmChannelName = "super-rare-spawns";
const exRaidChannelName = "all_raids_ex_only";

const richEmbedSelfName = 'RaidChannelBot';

var approvedRareSpawnPokemon = ['Unown', 'Tyranitar', 'Blissey', 'Dragonite', 'Ampharos', 'Slaking'];

// note that the approved pokemon list is not stored in a database and resets whenever the bot restarts
var approvedPokemon = ['lugia', 'articuno', 'zapdos', 'moltres', 'tyranitar', 'mew', 'mewtwo', 'raiku', 'entei', 'suicune', 'ho-oh', 'celebi']; // lower case

// how pokemon names will be shortened for use in channel names
const shortPokemonNames = [
    ['articuno', 'arti'],
    ['zapdos', 'zap'],
    ['moltres', 'molt'],
    ['tyranitar', 'ttar'],
    ['suicune', 'suic'],
    ['venusaur', 'venu'],
    ['charizard', 'chari'],
    ['blastoise', 'blast'],
    ['snorlax', 'snorl']
];

// how location names will be shortened for use in channel names
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

const maxPokemonNameLength = 10;
const maxLocNameLength = 18;
const maxChannelNameLength = 50; // to prevent name too long error
const raidChannelSuffix = "__"; // channels that end with this are deleted after the raid time ends or x minutes of inactivity
const raidChannelCheckInterval = 5 * 60 * 1000; // every 5 minutes
const raidChannelMaxInactivity = 120; // minutes
const raidChannelMaxTimeAfterRaid = 0; // minutes
const raidlastMaxMessagesSearch = 25; // number of most recent messages to search in each channel for a matching raid for the +raidlast command or +raidinfo command

const embedColor = 0xd28ef6;

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
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
  const gymHuntrbotId = client.users.find('username', gymHuntrbotName).id; // user id (global)
  if (message.author.bot && message.embeds[0]) {
    if (message.author.id === gymHuntrbotId) {
      // parse GymHuntrBot raid announcement
      const raidInfo = await parseGymHuntrbotMsg(message)
      .then(raidInfo => {
        // post enhanced raid info in channel
        postRaidInfo(message.channel, raidInfo);
        
        if (isReplaceGymHuntrBotPost) {
          // delete the original bot post
          message.delete().catch(O_o=>{});
        }
      });
      
      if (isAutoRaidChannelOn) {
        // only create a channel if the pokemon is approved
        if (approvedPokemon.includes(raidInfo.pokemonName)) {
          createRaidChannelAndPostInfo(message, raidInfo);
        }
      }
    } else if (message.author.username === raidBotName1 || message.author.username === raidBotName2) {
      //if raid notification occurs, process it here parse raid announcement
      const raidInfo = await parseRaidBotMsg(message)
      .then(raidInfo => {
        // post enhanced raid info in channel
        postRaidInfo(message.channel, raidInfo);
        
        if (isReplaceRaidBotPost) {
          // delete the original bot post
          message.delete().catch(O_o=>{});
        }
        
        if (raidInfo.isExRaidEligible) {
          const exRaidChannel = message.guild.channels.find("name", exRaidChannelName);
          if (exRaidChannel)
            postRaidInfo(exRaidChannel, raidInfo);
        }
      });
    } else if (message.author.username === huntrbotName) {
      // parse HuntrBot spawn announcement
      await parseHuntrbotMsg(message)
          .catch(error => {
            console.log(`Error parsing ${message}`);
           });
    } else if (message.channel.name === spawnPokeAlarmChannelName) {
      // parse Pokemon PokeAlarm spawn announcement
      await parsePokemonPokeAlarmMsg(message)
          .catch(error => {
            console.log(`Error parsing ${message}`);
           });
    }
  }
  
  if (message.author.bot) return;
  
  // Remove any mentions
  const content = message.content.replace(/<(@|#)\d+>/g, '').trim();
  // Save the mentions TODO
  const mentions = message.content.match(/(<(@|#)\d+>)/g);
  var mentionsStr = '';
  if (mentions != null) {
    mentionsStr = mentions.join(' ');
  }
  
  // Ignore any message that does not start with our prefix, 
  if (content.indexOf(config.prefix) !== 0) return;
  
  // Here we separate our "command" name, and our "arguments" for the command. 
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = content.split(/\s+/g);
  const command = args.shift().slice(config.prefix.length).toLowerCase();
    
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
  
  if (isPurgeEnabled && command === "purge") {
    // This command removes all messages from all users in the channel, up to 100.
    // First message is the purge command.
    if (!checkPermissionsManageChannel(message) || !checkPermissionsManageMessages(message)) return false;

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
      .catch(error => message.reply(`Sorry, I couldn't create channel ${args[0]} because of : ${error}`));
    message.reply(`Channel ${args[0]} has been created by ${message.author.tag}`);
  }
  
  if (command === "deletechannel") {
    var channels = message.guild.channels;
    var ch = channels.find('name', args[0]);
    await ch.delete()
      .catch(error => message.reply(`Sorry, I couldn't delete because of : ${error}`));
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
  
  // list all approved pokemon for raid channel creation
  if (isCreateChannelOn && command === "enableautoraid") {
    if (!checkPermissionsManageChannel(message)) return false;
    
    if (isAutoRaidChannelOn)
      return message.reply(`Automatic raid channel creation is already ON.`);
    else {
      isAutoRaidChannelOn = true;
      return message.reply(`Automatic raid channel creation is now ON.`);
    }
  }
  
  // list all approved pokemon for raid channel creation
  if (isCreateChannelOn && command === "disableautoraid") {
    if (!checkPermissionsManageChannel(message)) return false;
    
    if (!isAutoRaidChannelOn)
      return message.reply(`Automatic raid channel creation is already OFF.`);
    else {
      isAutoRaidChannelOn = false;
      return message.reply(`Automatic raid channel creation is now OFF.`);
    }
  }
  
  // create raid channel for manually entered raid information (i.e. not from gymHuntrBot)
  // e.g. +raid lugia princeton-stadium 7:49pm
  if (isCreateChannelOn && command === "raid") {
    if (args.length != 3)
      return message.reply(`Sorry, that is the incorrect format. The format for creating a raid channel is "${config.prefix}raid pokemonName locationNoSpaces time", e.g. "${config.prefix}raid lugia princeton-stadium 7:49pm.`);
    
    // parse the input: pokemonName locationNoSpaces time
    const pokemonName = args[0];
    const loc = args[1];
    const raidTime = args[2];
    const pokemonNameCap = pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1).toLowerCase();
    const locCap = loc.charAt(0).toUpperCase() + loc.slice(1);
    
    // check if pokemon is on approved list
    //if (!approvedPokemon.includes(pokemonName.toLowerCase()))
    //  return message.reply(`Sorry, ${args[0]} is not on my approved pokemon list for raid //channel creation.`);
    
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
    const raidTimeStr = raidTime.toLowerCase().replace(':', '-').replace(/[^\w-]/g, ''); // allowed variable length
    
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
          message.reply(`I created the temporary raid channel <#${channel.id}>. Go there to coordinate a raid battle against **${pokemonNameCap}** at **${locCap}**! `);
          channel.send(`**${pokemonNameCap}** has appeared at **${locCap}**! Raid ending: **${raidTime}**.\nPlease add a Google Maps link for the gym at ${locCap}.`);
          channel.setTopic(`Coordinate a raid versus ${pokemonNameCap} at ${locCap}! Ends at ${raidTime}.`);
          console.log(`Created channel #${channel.id} ${newChannelName}.`);
        })
        .catch(error => {
          message.reply(`Sorry ${message.author}, I couldn't create channel ${newChannelName} because of : ${error}`);
          console.log(`Couldn't create channel ${newChannelName} for ${message.author} because of : ${error}`);
        });
  }
  
  // delete all raid channels
  if (isCreateChannelOn && command === "deleteraids") {
    if (!checkPermissionsManageChannel(message)) return false;
    
    for (let [key, ch] of message.guild.channels) {
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
  
  // make a raid channel for the active raid for a pokemon on the approved list at 
  // the location entered (must be entered exactly as written in GymHuntrBot's original post / the PoGo gym name)
  // e.g. +channel Washington's Crossing
  if (isCreateChannelOn && command === "channel") {
    const enteredLoc = args.join(' ').replace(/\*|\./g, '').trim(); // also remove any asterisks and .'s
    await findRaid(enteredLoc)
        .then(raidInfo => {
          if (raidInfo) {
            createRaidChannelAndPostInfo(message, raidInfo);
          } else {
            message.reply(`Sorry, I couldn't find an active raid at ${enteredLoc}. Please check that you entered the location name correctly.`);
          }
        });
  }
  
  // post raid info for the active raid at 
  // the location entered (must be entered exactly as written in GymHuntrBot's original post / the PoGo gym name)
  // e.g. +info Washington's Crossing
  if (command === "info") {
    const enteredLoc = args.join(' ').replace(/\*/g, '').trim(); // also remove any asterisks
    await findRaid(enteredLoc)
        .then(raidInfo => {
          if (raidInfo) {
            postRaidInfo(message.channel, raidInfo);
          } else {
            message.reply(`Sorry, I couldn't find an active raid at **${enteredLoc}**. Please check that you entered the location name correctly.`);
          }
        });
  }
  
  // get a Google Maps url based on the gym name. not case sensitive. periods and asterisks are removed.
  // e.g. +whereis washington's crossing
  if (command === "where" || command === "whereis" || command === "map") {
    const enteredLoc = args.join(' ').replace(/\*/g, '').trim(); // remove any asterisks
    findRaidCoords(enteredLoc, results => {
      if (results != null && results.length > 0) {
        for (row of results) {
          message.reply(`**${row.name}**: ${gmapsUrlBase}${row.latitude},${row.longitude} ${mentionsStr}`);
        }
      } else {
        message.reply(`Sorry, I couldn't find a gym named **${enteredLoc}**. Please check that you entered the name correctly.`);
        console.log(`Could not find gym named: ${enteredLoc}`);
      }
    });
  }
});

// TODO see if async/await can be used here
function findRaidCoords(enteredLoc, callback) {
  db.all('SELECT name,latitude,longitude FROM gym where name like ?', enteredLoc, 
    (err, rows) => {
      if (err) {
        console.log(`Database error finding raid: ${err}`);
        callback(null);
      } else {
        callback(rows);
      }
    }
  );
}

// TODO see if async/await can be used here
// requires exact match on double values
function findGymNameFromCoords(latitude, longitude, resolved) {
  return new Promise(resolved => {
    db.all('SELECT name,latitude,longitude FROM gym where latitude=? and longitude=?', latitude, longitude, 
      (err, rows) => {
        if (err) {
          console.log(`Database error finding raid: ${err}`);
          resolved(null);
        } else {
          resolved(rows);
        }
      }
    );
  });
}

// TODO see if async/await can be used here
// requires exact match on double values
function isGymExRaidEligible(latitude, longitude, resolved) {
  return new Promise(resolved => {
    db.all('SELECT exraid_eligible FROM gym where latitude=? and longitude=?', latitude, longitude, 
      (err, rows) => {
        if (err) {
          console.log(`Database error finding raid: ${err}`);
          resolved(null);
        } else {
          resolved(rows);
        }
      }
    );
  });
}

// continuously check raid channels for inactivity
client.on('ready', (evt) => {
  /*for (let [key, ch] of client.channels) { // all channels in all servers
    if (ch.type === 'text') {
      ch.fetchMessages({limit: 10})
      .then(messages => {
        messages.forEach(message => {
          if (message.author.bot && (message.author.username === raidBotName1 || message.author.username === raidBotName2) && message.embeds[0]) {
            parseRaidBotMsg(message).then(
              raidInfo => {
              // post enhanced raid info in channel
              postRaidInfo(message.channel, raidInfo);
              
              if (isReplaceRaidBotPost) {
                // delete the original bot post
                message.delete().catch(O_o=>{});
              }
            });
          }
        });
      });
    }
  }
  
  for (let [key, ch] of client.channels) { // all channels in all servers
    if (ch.type === 'text') {
      ch.fetchMessages({limit: 10})
      .then(messages => {
        messages.forEach(message => {
          if (message.author.bot && message.author.username === gymHuntrbotName && message.embeds[0]) {
            parseGymHuntrbotMsg(message).then(
              raidInfo => {
              // post enhanced raid info in channel
              postRaidInfo(message.channel, raidInfo);
              
              if (isReplaceGymHuntrBotPost) {
                // delete the original bot post
                message.delete().catch(O_o=>{});
              }
            });
          }
        });
      });
    }
  }*/
  
  if (isCreateChannelOn) {
    checkRaidChannels();
    if (client.raidChannelCheckInterval)
      clearInterval(client.raidChannelCheckInterval);
    client.raidChannelCheckInterval = setInterval(checkRaidChannels, raidChannelCheckInterval);
  }
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

// TODO change this to check whether the bot has SEND MESSAGES permission
function checkPermissionsSendMessages(message) {
  if (!message.channel.permissionsFor(message.member).has('SEND_MESSAGES')) {
    return false;
  }
  return true;
}

// check raid channels for inactivity or after raid time and delete them if so
async function checkRaidChannels() {
  console.log(`Monitoring ${client.channels.size} channels for raid channel inactivity...`);
  for (let [key, ch] of client.channels) { // all channels in all servers
    // Check if is a raid channel
    if (ch.type === 'text' && ch.name.endsWith(raidChannelSuffix)) {
      console.log(`\tChecking #${ch.name} ...`);
      // Check if the time is Y minutes after the raid end time
      var raidTimeInput = ch.name.substring(0, ch.name.length - raidChannelSuffix.length);
      raidTimeInput = raidTimeInput.substring(raidTimeInput.lastIndexOf('_') + 1);
      // use current date but set time (use format e.g. "11-30pm")
      raidTimeMoment = moment(moment().format('YYYYMMDD') + ' ' + raidTimeInput, 'YYYYMMDD h-mma', true);
      if (raidTimeMoment.isValid() && raidTimeMoment.isBefore(moment().add(raidChannelMaxTimeAfterRaid, 'minutes'))) {
        console.log(`\tDeleting raid channel ${ch.id}: ${ch.name} because it is \>=${raidChannelMaxTimeAfterRaid} min past the raid end time.`);
        return ch.delete()
            .catch(error => console.log(`\tCouldn't delete raid channel <#${ch.id}> because of : ${error}`));
      }
        
      // Check if the last message was > X minutes ago or is Y minutes after the raid time
      ch.fetchMessages({limit: 2})
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

// search through previous self posts for raid information
// TODO much better to have a database of raid information instead of searching and parsing through post history
async function findRaid(enteredLoc) {
  var foundRaidInfo = false;
  for (let [chkey, ch] of client.channels) { // all channels in all servers - dangerous
    if (ch.type != 'text')
      continue;
    
    if (ch.name != raidBotChannelName) // only parse the raid bot channel
      continue;
    
    // search last X messages in all channels -- dangerous!! potentially super slow
    await ch.fetchMessages({limit: raidlastMaxMessagesSearch}) 
      .then(messages => {
        for (let [key, msg] of messages) {
          // only process msg if msg by this bot and in right format
          if (msg.author.id != client.user.id || !msg.embeds[0] || msg.embeds[0].color != embedColor)
            continue;
          
          // parse previous post
          const raidInfo = parseRaidInfo(msg);
          
          // check if location name matches the given name
          if (raidInfo.cleanLoc.toLowerCase() != enteredLoc.toLowerCase()) {
            continue;
          }
          
          // check if there is still time remaining in the raid
          if (raidInfo.raidTime.isBefore(moment())) {
            continue;
          }
          
          foundRaidInfo = raidInfo;
          break;
        }
      });
    if (foundRaidInfo)
      break;
  }
  return foundRaidInfo;
}

// process a GymHuntrBot message
async function parseGymHuntrbotMsg(lastBotMessage) {
  const emb = lastBotMessage.embeds[0];
  
  // get the pokemon thumbnail
  const thumbUrl = emb.thumbnail.url;
  
  // get the GPS coords and google maps URL
  const gpsCoords = new RegExp('^.*#(.*)','g').exec(emb.url)[1];
  const gmapsUrl = gmapsUrlBase + gpsCoords;
  const gmapsGeocodeOpts = {
    method: 'GET',
    uri: 'https://maps.googleapis.com/maps/api/geocode/json',
    qs: {
      key: config.gmapsApiKey,
      latlng: gpsCoords
    },
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true // Automatically parses the JSON string in the response
  }
  const gmapsLinkName = await rp(gmapsGeocodeOpts)
    .then(response => {
      const gmapsFAddress = response.results[0].formatted_address;
      return gmapsFAddress.split(',').slice(0, 2).join(',').replace('Township', 'Twp');
    })
    .catch(error => {
       console.log(`Google Maps reverse geocoding failed for coordinates ${gpsCoords}. Error: ${error}`);
       return 'Open in Google Maps';
    });
  
  const parts = emb.description.split('\n'); // if raid, location name is parts[0], name is parts[1], time left is parts[3]
  
  const gpsCoordsSplit = gpsCoords.split(',');
  var isExRaidEligible = false;
  const isExRaidEligibleResults = await isGymExRaidEligible(gpsCoordsSplit[0], gpsCoordsSplit[1]);
  if (isExRaidEligibleResults != null && isExRaidEligibleResults.length == 1) {
    isExRaidEligible = (isExRaidEligibleResults[0].exraid_eligible == 1);
  } else {
    console.log(`Could not find EX raid eligibility info for gym with coords: ${gpsCoordsSplit[0]},${gpsCoordsSplit[1]}`);
  }
  
  // clean up location name
  const loc = parts[0];
  const cleanLoc = loc.replace(/\*/g, '').slice(0, -1); // remove bold asterisks and trailing .
  var shortLoc = loc.toLowerCase().replace(/\s|_/g, '-').replace(/[^\w-]/g, '');
  for (var i = 0; i < shortLocNames.length; i++) { // shorten location names
    shortLoc = shortLoc.replace(shortLocNames[i][0], shortLocNames[i][1]);
  }
  shortLoc = shortLoc.substring(0, maxLocNameLength);
  shortLoc = shortLoc.replace(/-/g, ' ').trim().replace(/\s/g, '-'); // trim trailing -
  
  var pokemonName, shortPokemonName, timeRegex, raidTimeParts, timeStrHeader;
  // check for egg vs raid
  const titleEggMatch = new RegExp(/Level (\d) Raid is starting soon!/).exec(emb.title);
  if (titleEggMatch) {
    pokemonName = `Level ${titleEggMatch[1]} Egg`;
    timeRegex = new RegExp(/\*Raid Starting: (\d+) hours (\d+) min \d+ sec\*/g);
    raidTimeParts = timeRegex.exec(parts[1]);
    timeStrHeader = "Hatching at";
  } else {
    // extract the pokemon name
    pokemonName = parts[1];
    shortPokemonName = pokemonName.toLowerCase();
    for (var i = 0; i < shortPokemonNames.length; i++) { // shorten pokemon names
      shortPokemonName = shortPokemonName.replace(shortPokemonNames[i][0], shortPokemonNames[i][1]);
    }
    shortPokemonName = shortPokemonName.substring(0, maxPokemonNameLength);
    
    // extract the time remaining and compute the end time
    // don't include seconds -- effectively round down
    timeRegex = new RegExp(/\*Raid Ending: (\d+) hours (\d+) min \d+ sec\*/g);
    raidTimeParts = timeRegex.exec(parts[3]);
    timeStrHeader = "Until";
  }
  
  const raidTime = moment(lastBotMessage.createdAt).add(raidTimeParts[1], 'h').add(raidTimeParts[2], 'm');
  const raidTimeStr = raidTime.format('h-mma').toLowerCase();
  const raidTimeStrColon = raidTime.format('h:mma');
  const raidTimeRemaining = `${raidTimeParts[1]} h ${raidTimeParts[2]} m remaining`;
    
  return {
    pokemonName: pokemonName, 
    shortPokemonName: shortPokemonName, 
    cleanLoc: cleanLoc, 
    shortLoc: shortLoc, 
    raidTime: raidTime, 
    raidTimeStr: raidTimeStr, 
    raidTimeStrColon: raidTimeStrColon, 
    raidTimeRemaining: raidTimeRemaining, 
    timeStrHeader: timeStrHeader,
    thumbUrl: thumbUrl, 
    gpsCoords: gpsCoords, 
    gmapsUrl: gmapsUrl,
    gmapsLinkName: gmapsLinkName,
    isExRaidEligible: isExRaidEligible
  }
}

// process a Raid bot message
async function parseRaidBotMsg(lastBotMessage) {
  const emb = lastBotMessage.embeds[0];
  
  // get the pokemon thumbnail
  var thumbUrl = emb.thumbnail.url;
  
  // get the GPS coords and google maps URL
  const gpsCoords = new RegExp('^.*q=(.*)','g').exec(emb.url)[1];
  const gmapsUrl = gmapsUrlBase + gpsCoords;
  const gmapsGeocodeOpts = {
    method: 'GET',
    uri: 'https://maps.googleapis.com/maps/api/geocode/json',
    qs: {
      key: config.gmapsApiKey,
      latlng: gpsCoords
    },
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true // Automatically parses the JSON string in the response
  }
  const gmapsLinkName = await rp(gmapsGeocodeOpts)
    .then(response => {
      const gmapsFAddress = response.results[0].formatted_address;
      return gmapsFAddress.split(',').slice(0, 2).join(',').replace('Township', 'Twp');
    })
    .catch(error => {
       console.log(`Google Maps reverse geocoding failed for coordinates ${gpsCoords}. Error: ${error}`);
       return 'Open in Google Maps';
    });
  
  // clean up location name
  var loc = 'Unknown Gym Name';
  const gpsCoordsSplit = gpsCoords.split(',');
  const gymResults = await findGymNameFromCoords(gpsCoordsSplit[0], gpsCoordsSplit[1]);
  if (gymResults != null && gymResults.length > 0) {
    if (gymResults.length == 1) {
      loc = gymResults[0].name;
    } else
      console.log(`More than one gym entry for coords: ${gpsCoordsSplit[0]},${gpsCoordsSplit[1]}`);
  } else {
    console.log(`Could not find a gym with coords: ${gpsCoordsSplit[0]},${gpsCoordsSplit[1]}`);
  }
  
  var isExRaidEligible = false;
  const isExRaidEligibleResults = await isGymExRaidEligible(gpsCoordsSplit[0], gpsCoordsSplit[1]);
  if (isExRaidEligibleResults != null && isExRaidEligibleResults.length == 1) {
    isExRaidEligible = (isExRaidEligibleResults[0].exraid_eligible == 1);
  } else {
    console.log(`Could not find EX raid eligibility info for gym with coords: ${gpsCoordsSplit[0]},${gpsCoordsSplit[1]}`);
  }
  
  const cleanLoc = loc;
  var shortLoc = loc.toLowerCase().replace(/\s|_/g, '-').replace(/[^\w-]/g, '');
  for (var i = 0; i < shortLocNames.length; i++) { // shorten location names
    shortLoc = shortLoc.replace(shortLocNames[i][0], shortLocNames[i][1]);
  }
  shortLoc = shortLoc.substring(0, maxLocNameLength);
  shortLoc = shortLoc.replace(/-/g, ' ').trim().replace(/\s/g, '-'); // trim trailing -
  
  const parts = emb.description.split('\n'); 
  
  var pokemonName, shortPokemonName, timeRegex, timeStrHeader, level, eggUrl, moveset;
  // check for egg vs raid
  const titleEggMatch = new RegExp(/A Level (\d) raid is incoming!/).exec(emb.title);
  if (titleEggMatch) {
    pokemonName = `Level ${titleEggMatch[1]} Egg`;
    level = titleEggMatch[1];
    eggUrl = `https://raw.githubusercontent.com/kvangent/PokeAlarm/master/icons/egg_${level}.png`;
    timeRegex = new RegExp(/The egg will hatch at (.*) \(((\d+)h )?(\d+)m( (\d+)s)?\)/);
    timeStrHeader = "Hatching at";
    thumbUrl = `https://raw.githubusercontent.com/PokeHuntr/Assets/master/raidlevels/${level}.png`;
    
  } else {
    // extract the pokemon name
    const titleParts = new RegExp(/^Level (\d) Raid against (.*)!/g).exec(emb.title);
    level = titleParts[1];
    eggUrl = `https://raw.githubusercontent.com/kvangent/PokeAlarm/master/icons/egg_${level}.png`;
    pokemonName = titleParts[2];
    shortPokemonName = pokemonName.toLowerCase();
    for (var i = 0; i < shortPokemonNames.length; i++) { // shorten pokemon names
      shortPokemonName = shortPokemonName.replace(shortPokemonNames[i][0], shortPokemonNames[i][1]);
    }
    shortPokemonName = shortPokemonName.substring(0, maxPokemonNameLength);
    
    timeRegex = new RegExp(/The raid is available until (.*) \(((\d+)h )?(\d+)m( (\d+)s)?\)/);
    timeStrHeader = "Until";
    
    const movesetRegex = new RegExp(/Attacks: (.*)\/(.*)/g);
    moveset = movesetRegex.exec(parts[1]).slice(1,3);
  }
  
  const raidTimeParts = timeRegex.exec(parts[0]);
  const raidTime = moment(moment().format('YYYYMMDD') + ' ' + raidTimeParts[1], 'YYYYMMDD h:mm:ssa', true);
  const raidTimeStr = raidTime.format('h-mma').toLowerCase();
  const raidTimeStrColon = raidTime.format('h:mma');
  const raidTimeRemainingHs = raidTime.diff(moment(), 'hours');
  const raidTimeRemainingMs = raidTime.diff(moment(), 'minutes') - 60*raidTimeRemainingHs;
  const raidTimeRemaining = `${raidTimeRemainingHs} h ${raidTimeRemainingMs} m remaining`;
  
  var discussChannelID, discussChannelName, discussTextIndex;
  if (titleEggMatch) {
    discussTextIndex = 4;
  } else {
    discussTextIndex = 5;
  }
  if (parts.length == discussTextIndex + 1) { // there is channel info
    const foundChannel = lastBotMessage.guild.channels.find("name", parts[discussTextIndex]);
    if (foundChannel) {
      discussChannelName = parts[discussTextIndex];
      //discussChannelID = discussChannel.id;
    }
  }
  
  return {
    pokemonName: pokemonName, 
    shortPokemonName: shortPokemonName, 
    cleanLoc: cleanLoc, 
    shortLoc: shortLoc, 
    raidTime: raidTime, 
    raidTimeStr: raidTimeStr, 
    raidTimeStrColon: raidTimeStrColon, 
    raidTimeRemaining: raidTimeRemaining, 
    timeStrHeader: timeStrHeader,
    thumbUrl: thumbUrl, 
    gpsCoords: gpsCoords, 
    gmapsUrl: gmapsUrl,
    gmapsLinkName: gmapsLinkName,
    moveset: moveset,
    level: level,
    eggUrl: eggUrl,
    discussChannelID: discussChannelID,
    discussChannelName: discussChannelName,
    isExRaidEligible: isExRaidEligible
  }
}

async function createRaidChannelAndPostInfo(message, raidInfo) {
  await createRaidChannel(message, raidInfo)
    .then(channel => {
      if (channel) {
        // post raid info in new channel
        postRaidInfo(channel, raidInfo);
      }
    })
    .catch(error => console.log(`\tCouldn't create raid channel because of : ${error}`));
}

async function createRaidChannel(message, raidInfo) {
  // form the new channel name
  var newChannelName = raidInfo.shortPokemonName + "_" + raidInfo.shortLoc + "_" + raidInfo.raidTimeStr;
  newChannelName = newChannelName.substring(0, maxChannelNameLength - raidChannelSuffix.length) + raidChannelSuffix;
  
  // check for duplicates
  var isFound = false;
  for (var [key, ch] of message.guild.channels) {
    if (ch.name == newChannelName) {
      console.log(`Tried to create channel ${newChannelName} but it already exists.`);
      message.reply(`Channel <#${ch.id}> already exists.`);
      isFound = true;
      break;
    }
  }
  if (isFound)
    return;
  
  // create the channel
  return message.guild.createChannel(newChannelName, "text")
      .then(channel => {
        message.reply(`I created the temporary raid channel <#${channel.id}> (expires at ${raidInfo.raidTimeStrColon}). Go there to coordinate a raid battle against **${raidInfo.pokemonName}** at **${raidInfo.cleanLoc}**!`);
        channel.setTopic(`Coordinate a raid battle against ${raidInfo.pokemonName} at ${raidInfo.cleanLoc}! Ends at ${raidInfo.raidTimeStrColon}.`);
        console.log(`Created channel #${channel.id} ${newChannelName}.`);
        
        return channel;
      })
      .catch(error => {
        message.reply(`Sorry, I couldn't create channel ${newChannelName} because of : ${error}`);
        console.log(`Couldn't create channel ${newChannelName} for ${message.author} because of : ${error}`);
      });
}

async function postRaidInfo(channel, raidInfo) {
  var movesetStr = '';
  if (raidInfo.moveset && raidInfo.moveset.length > 0) {
    movesetStr = `Moves: ${raidInfo.moveset[0]} / ${raidInfo.moveset[1]}\n`;
  }
  /*var avatarUrl = '';
  if (raidInfo.eggUrl) 
    avatarUrl = raidInfo.eggUrl;*/
  var discussChannelStr = '';
  //if (raidInfo.discussChannelID && raidInfo.discussChannelID.length > 0) {
    //discussChannelStr = `\nDiscuss: <#${raidInfo.discussChannelID}>`;
  //}
  if (raidInfo.discussChannelName && raidInfo.discussChannelName.length > 0) {
    discussChannelStr = `\nDiscuss in: #${raidInfo.discussChannelName}`;
  }
  
  var isExRaidEligibleStr = '';
  if (raidInfo.isExRaidEligible) {
    isExRaidEligibleStr = `\n**EX Raid Eligible Gym**`;
  }
  
  const newEmbed = new Discord.RichEmbed()
    .setTitle(`${raidInfo.cleanLoc}`)
    .setDescription(`**${raidInfo.pokemonName}**\n${raidInfo.timeStrHeader} **${raidInfo.raidTimeStrColon}** (${raidInfo.raidTimeRemaining})\n${movesetStr}Map: **[${raidInfo.gmapsLinkName}](${raidInfo.gmapsUrl})**${discussChannelStr}${isExRaidEligibleStr}`)
    .setThumbnail(`${raidInfo.thumbUrl}`)
    .setColor(embedColor)
    .setURL(`${raidInfo.gmapsUrl}`);
//    .setAuthor(richEmbedSelfName, avatarUrl);
  if (isMapImageEnabled) {
    newEmbed.setImage(`https://maps.googleapis.com/maps/api/staticmap?center=${raidInfo.gpsCoords}&zoom=15&scale=1&size=600x600&maptype=roadmap&key=${config.gmapsApiKey}&format=png&visual_refresh=true&markers=size:mid%7Ccolor:0xff0000%7Clabel:%7C${raidInfo.gpsCoords}`);
  }
  channel.send({embed: newEmbed});
}

// parse raid info generated by this bot
function parseRaidInfo(message) {
  const emb = message.embeds[0];
  
  // get the pokemon thumbnail
  const thumbUrl = emb.thumbnail.url;
  
  // get the GPS coords and google maps URL
  var gpsCoords = 'n/a';
  if (emb.image && emb.image != null) {
    gpsCoords = new RegExp('https://maps\\.googleapis\\.com/maps/api/staticmap\\?center=(.*)&zoom.*').exec(emb.image.url)[1];
  }
  const gmapsLink = new RegExp('.*\\[(.*)\\]\\((.*)\\).*').exec(emb.description)
  const gmapsLinkName = gmapsLink[1];
  const gmapsUrl = gmapsLink[2];
  
  const parts = emb.description.split('\n');
  
  // extract the pokemon name
  const pokemonName = parts[0].replace(/\*|\./g, ''); // remove bold asterisks and periods;
  var shortPokemonName = pokemonName.toLowerCase();
  for (var i = 0; i < shortPokemonNames.length; i++) { // shorten pokemon names
    shortPokemonName = shortPokemonName.replace(shortPokemonNames[i][0], shortPokemonNames[i][1]);
  }
  shortPokemonName = shortPokemonName.substring(0, maxPokemonNameLength);
  
  // clean up location name
  const loc = emb.title;
  const cleanLoc = loc.replace(/\*/g, ''); // remove bold asterisks
  var shortLoc = loc.toLowerCase().replace(/\s|_/g, '-').replace(/[^\w-]/g, '');
  for (var i = 0; i < shortLocNames.length; i++) { // shorten location names
    shortLoc = shortLoc.replace(shortLocNames[i][0], shortLocNames[i][1]);
  }
  shortLoc = shortLoc.substring(0, maxLocNameLength);
  shortLoc = shortLoc.replace(/-/g, ' ').trim().replace(/\s/g, '-'); // trim trailing -
  
  // extract the time remaining and compute the end time
  // don't include seconds -- effectively round down
  const timeRegex = new RegExp('(.*) \\*\\*(.*)\\*\\* \\((.*)\\)');
  const raidTimeParts = timeRegex.exec(parts[1]);
  const raidTimeInput = raidTimeParts[2].toLowerCase();
  // use current date but set time (use format e.g. "11:30pm")
  const raidTime = moment(moment().format('YYYYMMDD') + ' ' + raidTimeInput, 'YYYYMMDD h:mma', true);
  const raidTimeStr = raidTime.format('h-mma').toLowerCase();
  const raidTimeStrColon = raidTime.format('h:mma');
  const raidTimeRemaining = raidTimeParts[3];
  const timeStrHeader = raidTimeParts[1];
  
  const movesetRegex = new RegExp('Moves: (.*) \/ (.*)');
  const movesetParts = movesetRegex.exec(parts[2]);
  var moveset = [];
  if (movesetParts && movesetParts.length > 0)
    moveset = movesetParts.slice(1, 3);
  
  var discussChannelID, discussChannelName, discussTextIndex;
  if (timeStrHeader == "Hatching at") {
    discussTextIndex = 3;
  } else {
    discussTextIndex = 4;
  }
  if (parts.length == discussTextIndex + 1) { // there is channel info
    const parsedChannel = new RegExp(/Discuss in: #(.*)/).exec(parts[discussTextIndex]);
    if (parsedChannel) {
      discussChannelName = parsedChannel[1];
      //discussChannelID = discussChannel.id;
    }
  }
  
  return {
    pokemonName: pokemonName, 
    shortPokemonName: shortPokemonName, 
    cleanLoc: cleanLoc, 
    shortLoc: shortLoc, 
    raidTime: raidTime, 
    raidTimeStr: raidTimeStr, 
    raidTimeStrColon: raidTimeStrColon, 
    raidTimeRemaining: raidTimeRemaining, 
    timeStrHeader: timeStrHeader,
    thumbUrl: thumbUrl, 
    gpsCoords: gpsCoords, 
    gmapsUrl: gmapsUrl, 
    gmapsLinkName: gmapsLinkName, 
    moveset: moveset,
    discussChannelID: discussChannelID,
    discussChannelName: discussChannelName
  }
}

// process a HuntrBot message
async function parseHuntrbotMsg(lastBotMessage) {
  const emb = lastBotMessage.embeds[0];
  const titleMatch = new RegExp(/A wild (.*) \((\d+)\) has appeared!/).exec(emb.title);
  if (titleMatch && approvedRareSpawnPokemon.includes(titleMatch[1])) {
    lastBotMessage.channel.send(`@everyone A wild ${titleMatch[1]} has appeared in the area! See above.`);
    console.log(`Adding to Huntrbot message: @everyone A wild ${titleMatch[1]} has appeared in the area! See above.`);
  } else if (!titleMatch) {
    console.log(`Could not parse Huntrbot message: ${emb.title}`);
  }
}

// process a PokeAlarm message
async function parsePokemonPokeAlarmMsg(lastBotMessage) {
  const emb = lastBotMessage.embeds[0];
  const titleMatch = new RegExp(/(.*)!/).exec(emb.title);
  if (titleMatch && approvedRareSpawnPokemon.includes(titleMatch[1])) {
    lastBotMessage.channel.send(`@everyone A wild ${titleMatch[1]} has appeared in the area! See above.`);
    console.log(`Adding to PokeAlarm message: @everyone A wild ${titleMatch[1]} has appeared in the area! See above.`);
  } else if (!titleMatch) {
    console.log(`Could not parse Huntrbot message: ${emb.title}`);
  }
}

db.on("error", error => console.log("Database error: ", error));

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

client.login(config.token);
