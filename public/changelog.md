# changelog

## v1.0
- mario now uses his fall and stun sprites, with his animations transitioning correctly during play
- uppercut is now a smaller, bouncing fireball that uses the fireball sprites and sound, stops at collisions, and stuns the killer on hit; multiplayer shots are synchronized
- mario's fireball and spin cooldowns are 12 seconds on hit and 20 on miss, with the existing lms cooldown scaling
- players stay upright on slopes, and semisolid platforms catch fast falls more reliably
- evil lux's pull has less range, roots him while active, and ends if its target escapes; low damage shortens its cooldown
- evil lux's rush and pull do less damage, while his movement speed stays unchanged and his m1 damage is restored to 30
- lux's prayer effects are labeled above the abilities; overheal is now patch, gives lux 25 shield, and shares up to 50 shield evenly among nearby allies
- patch uses the lux_healpatch sound; lux's prayer, run, and quieter panting sounds are also in
- survivors see a red vignette when hit, and the killer sees a black vignette when stunned
- green hill's sunset tint is stronger and more orange
- bear5 is public now, and his m1 deals 15 damage
- shadow mario is a 300 hp dev killer with m1, slam, mimic, dive, and spin; he uses his own name art and no evil lux voice lines

## v0.94
- keybinds!! open settings, theres a new "keys" section at the bottom
- remap left/right/down/jump plus all 6 ability keys. click a key to remove it, hit + to add another one
- your ability bar shows whatever keys you picked now, and "reset keys" puts everything back to default
- new waiting-for-players and intermission songs!! (if you still hear the old ones, hard refresh)
- evil lux cant swing or use any other moves while his pull is dragging someone around
- everyones jumps go a little higher now
- green hill has a real sunset background now instead of flat blue
- a few new springs are hiding around green hill

## v0.93
- you can tell when you get hit now: the screen edges flash red and you hear an "ouch!"
- landing a hit shows a little "hit (their name)" up top, and a stunned killer goes dark on every screen
- toko buff: roundhouse hits harder and recharges faster, jab stuns longer
- evil lux nerf: swing and rush hit softer, pull burns less, swings come out slower

## v0.92
- the round map is a random pick from a loot pool now, so you never know what you're getting
- new map!! GREEN HILL, built with the level script like the others. has its own music (temporary track for now)
- both maps keep their own spawns, springs and music

## v0.91
- new intermission map built with the real level script, plus background and front props
- intermission got springs
- mid match joins wait in intermission now. they cant see the round and the round cant see them
- party list only shows people actually playing
- lobby costumes match on every screen now
- winners banner in the middle of the screen is gone
- run animations are faster, footsteps are slower
- tips stay on the loading screen, new logo on title, new favicon

## v0.90
- mario is public now. uppercut launches killers straight up (no sideways knockback) even through iframes, plus spin jump with the luma puff
- spin got its own sound, uppercut got charge + release sounds, mario jumps got quieter
- mario has his own lms anthem
- all survivor cooldowns down 10%, killer stays the same
- brand new intermission map built with the real level script. has a background and front props too
- intermission got springs. lobby costumes finally match on every screen
- mid match joins chill in intermission now, and they cant see the round (and the round cant see them)
- party list only shows people actually playing
- game is called redrawn now. new logo on the title screen, new favicon
- winners banner in the middle of the screen is gone
- footsteps are slower, tips only on the loading screen

## v0.89
- mario joined. sprites, icon, name art, his own lms song, uppercut + spin jump
- fades to black on every transition
- knockback pops killers up, survivor cds down again
- tips keep growing (its pronounced LUCKS)

## v0.88
- lux heal is OVERHEAL now. +50 blue hp to whoever needs it most, drains quiet, never yourself or the killer
- lux got slower energy conversion, planted heal, prayer tag with colors, random prayer on spawn, lms self shield, fixed remote animations
- every kit has particles now (other people see them too), turn em off in settings
- settings menu. toggles, volume sliders, shake switch, saves in your browser
- mod menu got sections, danger colors, folding groups, time setter
- character select shows idle portraits, blurbs live in chars.txt, killer slot stays empty till picked, real name art
- bear5: his own chase song, no fly (just really fast), real intro video, m1 icon, killers hear their own chase
- evil lux: new chase/terror songs, sneak darkens your screen, winscreen movie when he wins
- loads way faster: one bundle.js, music waits for you, watchdog calls out dead scripts, real fullscreen
- rounds flow: no results screen, loading card in intermission, killer cinema needs everyone to skip
- new ability icons, footsteps speed up when you run, map tips, blue bars, low hp static warning

## v0.87 - the great organization
- tails bombs stay where they land now
- code got split up: python server plus tiny js files
- only public/ is served (your .env and stuff isnt downloadable anymore)

## v0.86
- todo: fix this
## earlier
- chat is quick shouts now (12 of em, no typing)
- springs everywhere, red/orange/yellow
- sonic playable: peelout carries your friends, spindash stuns
- lms is a death duel, no timer
- lux and sonic got their own lms anthems
- death static and noise, spectate text waits for it
- party list with chase callouts
- title screen gates joining, fake 3s loading
- f11 shows x/y, f12 is mods only

## earlier
- new sonic art wired in
- killer iframes, cower counters, stuns shove
- pull rework: windup, through walls, ticks, whiffs stun you back
- error screen, no more offline mode
- photo warning splash
- afk button, spike pips
- red rush telegraph, offscreen trip arrows
- chat filter plus 10 min mutes, mods via admins.txt
