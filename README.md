# PoGo Raid Organizer

This Discord bot listens to a channel for raid announcements by the GymHuntrBot (http://discord.pokehuntr.com). If the raid announcement is for a pokemon on the approved list, this bot will create a new raid channel for coordinating Pokemon Go Trainers to battle the raid boss. Inactive raid channels are automatically deleted. 

Key prefix: + symbol

Commands:
+raidlast: Creates a raid channel for the last qualifying raid announcement made by GymHuntrBot in the GymHuntrBot channel. Also makes a post with a Google Maps URL to the gym location.
+raid [pokemonName] [locationNoSpaces] [time]: If [pokemonName] is on the approved list for making raid channels, this creates a raid channel with the location and time information. Please add a Google Maps URL of the gym location to that channel to help Trainers find it. For example, +raid lugia princeton-stadium 7:49pm
+deleteraidchannels: Deletes all raid channels (as identified by the suffix "__") regardless of inactivity. Requires MANAGE_CHANNELS permission.
+approve [list of pokemon names]: These pokemon will be added to the approved list for making raid channels. Requires MANAGE_CHANNELS permission.
+disapprove [list of pokemon names]: These pokemon will be removed to the approved list for making raid channels. Requires MANAGE_CHANNELS permission.
+list: These pokemon are on the approved list for making raid channels. Default: Lugia, Articuno, Zapdos, Moltres, Tyranitar

+say [message]: The bot will say [message].
+ping: Tests ping time of the bot.

Automatic:
- Listens to channel (default name: "GymHuntrBot") for raid announcements by the GymHuntrBot (default name: "huntrbot").
- Deletes inactive raid channels (default inactivity time: 60 min), checking periodically (default: every 2 minutes).




This bot uses code from the following (MIT-licensed code):

https://gist.github.com/eslachance/3349734a98d30011bb202f47342601d3
https://anidiots.guide/getting-started/your_basic_bot.html
https://github.com/praneetsharma/ClearMessagesBot-Discord