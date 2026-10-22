![Party Crashers Redrawn Logo](https://github.com/key-limepi/party-crashers-redrawn/blob/main/public/Assets/Images/logo.png?raw=true)
**Party Crashers Redrawn** is a 2D ASYM (Similiar to the likes of *Dead By Daylight* and *Outcome Memories*) made for [Formbar](https://github.com/csmith1188/Formbar.js) programmed in Javascript and Python. This **README** acts as a guide for installing, running, and managing the game, as well as documents for future updates to come.
[!CAUTION]
> This game is in early development, expect bugs and changes to the game as things advance in the future.
## Requirements (Before you host)
If you are **hosting the game**, you will need a few things before you do so. These things include:
- [Python 3](https://www.python.org/downloads/)
- An open port on your router/server (port `8000` is the default, but can be changed in `.env`)
- Around 3GB of RAM (at the *least*, 4GB works perfectly on my server)
- A stable internet connection (Over ~100 ping things start to get pretty choppy...)
# Hosting
now that you have everything you need, lets get started! its very simple, really.
> [!TIP]
 >This works best on Linux/macOS, since other operating systems cannot pull from the github automatically. It still works, however.
## Windows
On Windows, there is a file named `start-server.bat` which is a one-click way to begin the server. By default, it runs on port `8000`.
> [!WARNING]
> This batch script **will not** update the game automatically. We are working on fixing this, but as of now it does not work!

## macOS/Linux
On macOS and Linux, you can run `start-server.sh` to start the game server on port `8000`.
> You may need to use `chmod +x start-server.sh` so the command can run first.
## Manually
todo: finish this readme
