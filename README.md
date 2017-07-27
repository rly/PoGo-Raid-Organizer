# Pokemon Go Raid Organizer Discord Bot

## Introduction

This Discord bot listens to a Discord channel for raid announcements by the GymHuntrBot (http://discord.pokehuntr.com). If the raid announcement is for a pokemon on the approved list, this bot will create a new raid channel for helping Pokemon Go Trainers meet at the raid gym at an arranged time to battle the pokemon together. Inactive raid channels are automatically deleted. 

## Commands

Key prefix: `+`

### Channel Management

- `+raidlast` - Creates a raid channel for the last qualifying raid announcement made by GymHuntrBot in the GymHuntrBot channel. Also makes a post with a Google Maps URL to the gym location.
- `+raid pokemonName locationNoSpaces time` - If `pokemonName` is on the approved list for making raid channels, this creates a raid channel with the location and time information. Please add a Google Maps URL of the gym location to that channel to help Trainers find it. For example, `+raid lugia princeton-stadium 7:49pm`
- `+deleteraidchannels` - Deletes all raid channels (as identified by the suffix "__") regardless of inactivity. Requires `MANAGE_CHANNELS` permission.

### Approved Pokemon List Management

- `+approve listOfPokemonNames` - These pokemon will be added to the approved list for making raid channels. Requires `MANAGE_CHANNELS` permission.
- `+disapprove listOfPokemonNames` - These pokemon will be removed to the approved list for making raid channels. Requires `MANAGE_CHANNELS` permission.
- `+list` - These pokemon are on the approved list for making raid channels. Default: Lugia, Articuno, Zapdos, Moltres, Tyranitar

### Utilities

- `+say message` - The bot will say `message`.
- `+ping` - Tests ping time of the bot.

## Automatic Actions

- Listens to channel (default name: "GymHuntrBot") for raid announcements by the GymHuntrBot (default name: "huntrbot").
- Deletes inactive raid channels (default inactivity time: 60 min), checking periodically (default: every 2 minutes).

## Setup and Deploy

- Currently this runs on a local node.js server.
- TODO add instructions for hosting locally
- TODO deploy in cloud and add instructions

## Credits

This bot uses code from the following (MIT-licensed code):

https://gist.github.com/eslachance/3349734a98d30011bb202f47342601d3

https://anidiots.guide/getting-started/your_basic_bot.html

https://github.com/praneetsharma/ClearMessagesBot-Discord
