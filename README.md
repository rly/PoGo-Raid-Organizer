# Pokemon Go Raid Organizer Discord Bot

## Introduction

This Discord bot listens to a Discord channel for raid announcements by the GymHuntrBot (http://discord.pokehuntr.com). If the raid announcement is for a pokemon on the approved list, this bot will create a new raid channel for helping Pokemon Go Trainers meet at the raid gym at an arranged time to battle the pokemon together. Inactive raid channels are automatically deleted. 

## Commands

Key prefix: `+`

### Raid Info

- `+raidinfo exactGymNameWithSpaces` - Looks for raid announcements made by GymHuntrBot in any watched channel for the given gym. The Pokemon does not have to be on the approved list. If the raid is ongoing, the bot makes a post with a Google Maps URL and GPS coordinates to the gym location. For example, `+raidinfo Washington's Crossing`

### Channel Management

- `+raidlast exactGymNameWithSpaces` - Looks for raid announcements made by GymHuntrBot in any watched channel for the given gym. The Pokemon does not have to be on the approved list. If the raid is ongoing, the bot makes a raid channel and makes a post with a Google Maps URL and GPS coordinates to the gym location. For example, `+raidlast Washington's Crossing`
- `+raid pokemonName locationNoSpaces time` - Creates a raid channel with the given pokemon name, location, and time information. The Pokemon does not have to be on the approved list. Make sure to add a Google Maps URL of the gym location to that channel to help Trainers find it. For example, `+raid lugia princeton-stadium 7:49pm`
- `+deleteraids` - Deletes all raid channels (as identified by the suffix "__" by default) regardless of state. Requires `MANAGE_CHANNELS` permission.
- `+enableautoraid` - Enables automatic raid channel creation from GymHuntrBot's posts (see below)
- `+disableautoraid` - Disables automatic raid channel creation from GymHuntrBot's posts (see below)

### Approved Pokemon List Management

- `+approve listOfPokemonNames` - These pokemon will be added to the approved list for making raid channels automatically. Requires `MANAGE_CHANNELS` permission.
- `+disapprove listOfPokemonNames` - These pokemon will be removed to the approved list for making raid channels automatically. Requires `MANAGE_CHANNELS` permission.
- `+list` - These pokemon are on the approved list for making raid channels automatically. Default: Lugia, Articuno, Zapdos, Moltres, Tyranitar, Mew, Mewtwo, Raiku, Entei, Suicune, Ho-oh, Celebi

### Utilities

- `+say message` - The bot will say `message`.
- `+ping` - Tests ping time of the bot.
- `+purge numMessages` - [Currently disabled.] Deletes `numMessages` most recent messages from the current channel. `numMessages` must be between 2 and 100. Requires `MANAGE_CHANNELS` and `MANAGE_MESSAGES` permissions. 

## Automatic Actions

- Listens to channel (default name: "huntrbot") for raid announcements by the GymHuntrBot and creates raid channels based on its posts if the pokemon is approved. Also makes a post with a Google Maps URL and GPS coordinates to the gym location. [Default off]
- Deletes raid channels after the raid time has passed.
- Deletes inactive raid channels (default inactivity time: 2 hours), checking periodically (default: every 5 minutes).
- Shortens Pokemon names and location names when forming the name of a new raid channel.

## Add the bot to your Discord server

- If you already have a Discord server, you can authorize the Bot to run on your server here: https://goo.gl/ottg3W

## Setup and Deploy

- Currently this runs on a local node.js server.

## Pros and Cons

Use of this bot has some advantages:
- Raid discussions are isolated in single channels. Users can easily see the current status of coordinating a raid by reading the most recent few messages in a raid channel.
- Users can easily see information about the Pokemon name, location (name, GPS coords, map image, and map link), and end time for each raid.
- Users can easily see which raids are active by looking at the channel list.

Use of this bot has some disadvantages:
- The bot relies heavily on GymHuntrBot working quickly and accurately (and not changing how they announce raids). Otherwise, users have to create raid channels manually.
- Creating raid channels manually requires knowing the command format.
- The bot may create a raid channel for a raid for which someone has already created a raid channel manually. 
- The bot creates new channels which cannot be muted. Everyone would get notifications if they allow notifications. 
- It's harder to coordinate people across raid locations.
- Having lots of raid channels can lead to confusion, (but there would be similar confusion if all these raid discussions were in the same channel).

Some of the above disadvantages can be fixed if GymHuntrBot reports raids quickly and accurately.

## TODO

- Implement `+help`.
- Add instructions for hosting locally
- Deploy in cloud and add instructions


## Credits

This bot uses some code from the following (MIT-licensed code):

https://gist.github.com/eslachance/3349734a98d30011bb202f47342601d3

https://anidiots.guide/getting-started/your_basic_bot.html

https://github.com/praneetsharma/ClearMessagesBot-Discord
