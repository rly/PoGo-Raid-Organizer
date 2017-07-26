// Load up the discord.js library
const Discord = require("discord.js");

// Load library for formatting dates and times
const dateFormat = require('dateformat');

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

const gymHuntrbotTag = "ryly#4813";
const gymHuntrbotChannel = "huntrbot"

const pokemonToTrack = ['Lugia', 'Articuno', 'Zapdos', 'Moltres'];
const maxPokemonNameLength = 12;
const maxLocNameLength = 26;

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
  if(message.author.tag === gymHuntrbotTag && message.channel.name === gymHuntrbotChannel) {
    message.channel.send("hello");
    var msg = message.embeds[0];
    message.channel.send(msg.title);
    message.channel.send(msg.description);
    var descrip = msg.description;
    // location is parts[1], name and CP is parts[3], time left is parts[5]
    var parts = descrip.split('"');
    
    // extract the pokemon name
    var pokemonName = parts[3].match(/[^\r\n]+/g)[1];
    // if pokemon name is not a selected one, return
    if !pokemonToTrack.find(pokemonName) return;

    pokemonName = pokemonName.substring(0, maxPokemonNameLength);
    message.channel.send(pokemonName);
    
    // extract first three words only from location
    const shortLocRegex = new RegExp('^([\S]+)?\s?([\S]+)?\s?([\S]+)?', 'g');
    var shortLoc = shortLocRegex.exec(parts[1]).join('-').substring(0, maxLocNameLength);
    message.channel.send(shortLoc);
    
    // extract the time remaining and compute the end time
    // don't include seconds -- effectively round down
    const timeRegex = new RegExp('Raid Ending: (\d) hours (\d) min \d sec', 'g');
    var raidTimeParts = timeRegex.exec(parts[5]);
    var raidTime = new Date(new Date().getTime() + raidTimeParts[0]*24*60*1000 + raidTimeParts[1]*60*1000);
    var raidTimeStr = dateFormat(raidTime, 'h:MMtt');
    message.channel.send(raidTimeStr);
    
    // channel name max length is 50
    var newChannelName = pokemonName + "@" + shortLoc + "_end@" + raidTimeStr;
    message.channel.send();
    
    // TODO mark as temporary channel
    await message.guild.createChannel(newChannelName, "text")
      .catch(error => message.reply(`Sorry ${message.author}, I couldn't create channel ${args[0]} because of : ${error}`));
      
    return;
  }
  
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;
  
  // Also good practice to ignore any message that does not start with our prefix, 
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;
  
  // Here we separate our "command" name, and our "arguments" for the command. 
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.split(/\s+/g);
  const command = args.shift().slice(config.prefix.length).toLowerCase();
  
  // Let's go with a few common example commands! Feel free to delete or change those.
  
  if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }
  
  if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
    // To get the "message" itself we join the `args` back into a string with spaces: 
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{}); 
    // And we get the bot to say the thing: 
    message.channel.send(sayMessage);
  }
  
  if(command === "kick") {
    // This command must be limited to mods and admins. In this example we just hardcode the role names.
    // Please read on Array.some() to understand this bit: 
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
    if(!message.member.roles.some(r=>["Administrator", "Moderator"].includes(r.name)) )
      return message.reply("Sorry, you don't have permissions to use this!");
    
    // Let's first check if we have a member and if we can kick them!
    // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.kickable) 
      return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");
    
    // slice(1) removes the first part, which here should be the user mention!
    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Please indicate a reason for the kick!");
    
    // Now, time for a swift kick in the nuts!
    await member.kick(reason)
      .catch(error => message.reply(`Sorry ${message.author}, I couldn't kick because of : ${error}`));
    message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);

  }
  
  if(command === "ban") {
    // Most of this command is identical to kick, except that here we'll only let admins do it.
    // In the real world mods could ban too, but this is just an example, right? ;)
    if(!message.member.roles.some(r=>["Administrator"].includes(r.name)) )
      return message.reply("Sorry, you don't have permissions to use this!");
    
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.bannable) 
      return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Please indicate a reason for the ban!");
    
    await member.ban(reason)
      .catch(error => message.reply(`Sorry ${message.author}, I couldn't ban because of : ${error}`));
    message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
  }
  
  /*if(command === "purge") {
    // This command removes all messages from all users in the channel, up to 100.
    
    // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);
    
    // Ooooh nice, combined conditions. <3
    if(!deleteCount || deleteCount < 2 || deleteCount > 100)
      return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");
    
    // So we get our messages, and delete them. Simple enough, right?
    const fetched = await message.channel.fetchMessages({count: deleteCount});
    message.channel.bulkDelete(fetched)
      .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
  }*/
  
  /*if(command === "createchannel") {
    await message.guild.createChannel(args[0], "text")
      .catch(error => message.reply(`Sorry ${message.author}, I couldn't create channel ${args[0]} because of : ${error}`));
    message.reply(`Channel ${args[0]} has been created by ${message.author.tag}`);
  }
  
  if(command === "deletechannel") {
    var channels = message.guild.channels;
    var ch = channels.find('name', args[0]);
    await ch.delete()
      .catch(error => message.reply(`Sorry ${message.author} I couldn't delete because of : ${error}`));
    message.reply(`Channel ${args[0]}  has been deleted by ${message.author.tag}`);
  }*/
  
  if(command === "test") {
    message = channel.fetchMessages({limit: 10})[0]; // TEMP get the first message in the channel (bot)
    message.channel.send("hello");
    var msg = message.embeds[0];
    message.channel.send(msg.title);
    message.channel.send(msg.description);
    var descrip = msg.description;
    // location is parts[1], name and CP is parts[3], time left is parts[5]
    var parts = descrip.split('"');
    
    // extract the pokemon name
    var pokemonName = parts[3].match(/[^\r\n]+/g)[1];
    // if pokemon name is not a selected one, return
    if !pokemonToTrack.find(pokemonName) return;

    pokemonName = pokemonName.substring(0, maxPokemonNameLength);
    message.channel.send(pokemonName);
    
    // extract first three words only from location
    const shortLocRegex = new RegExp('^([\S]+)?\s?([\S]+)?\s?([\S]+)?', 'g');
    var shortLoc = shortLocRegex.exec(parts[1]).join('-').substring(0, maxLocNameLength);
    message.channel.send(shortLoc);
    
    // extract the time remaining and compute the end time
    // don't include seconds -- effectively round down
    const timeRegex = new RegExp('Raid Ending: (\d) hours (\d) min \d sec', 'g');
    var raidTimeParts = timeRegex.exec(parts[5]);
    var raidTime = new Date(new Date().getTime() + raidTimeParts[0]*24*60*1000 + raidTimeParts[1]*60*1000);
    var raidTimeStr = dateFormat(raidTime, 'h:MMtt');
    message.channel.send(raidTimeStr);
    
    // channel name max length is 50
    var newChannelName = pokemonName + "@" + shortLoc + "_end@" + raidTimeStr;
    message.channel.send();
    
    // TODO mark as temporary channel
    await message.guild.createChannel(newChannelName, "text")
      .catch(error => message.reply(`Sorry ${message.author}, I couldn't create channel ${args[0]} because of : ${error}`));
  }
  
  // TODO delete temporary channel after one hour of inactivity
  
});

client.login(config.token);
           