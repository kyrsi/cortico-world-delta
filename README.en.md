<p align="center">
  <img src="documents/assets/game-observer.svg" alt="Game observer, a small fish spotting a red loot tile" width="960">
</p>

<h1 align="center">Game observer</h1>
<p align="center">Let Coo check kill notifications and the safe box in Delta Force at regular intervals.</p>
<p align="center"><a href="README.md" lang="zh-CN">简体中文</a> · English</p>
<p align="center"><code>1.1.0</code> · <code>Windows</code> · <code>Cortico World API 6</code> · <a href="LICENSE">AGPL-3.0-or-later</a></p>

Game observer watches the monitor you select, reads combat notifications with Windows OCR and looks for red-tier loot candidates in inventory and container grids. Coo can react to an event with its screenshot and your own game notes. Your pet can stay on one monitor while you play on another.

## Host compatibility

- **Stock Coopanion 0.2.23 on Windows** uses the World’s own screen capture. Choose a monitor and grant access in the observer panel. Coopanion’s global pause controls event delivery. To stop screen reading, pause or stop observation in the panel. Either action, or a Core restart, ends the grant.
- **Customized Coopanion 0.2.22 with the observer binding** uses the host’s monitor selection, viewing policy and registered calibration shortcut. [World binding interface](src/protocol.ts)

## Install

1. Open **World extensions → Extension market** in Coopanion. Search for **Game observer** or `cortico-world-delta` and add it to **My Worlds**.
2. Restart when prompted, activate **Game observer** under **My Worlds** and open the observer panel.

While the market index updates, you can install `cortico-world-delta@1.1.0` in advanced mode under **Extensions → Install from npm**. For offline installation, extract the matching release package and use **Install from local directory**. Select the folder containing `package.json`, `describe.json` and `dist`, and keep it in place.

## First raid

1. Click **▶ Start observation** at the top of the observer panel. The control stays visible as you scroll. For a new setup, select **Quick setup** beside a missing item, choose combat or loot detection, and save the game language. When ready, press play, choose the game monitor and grant access. The customized host requires game observation to be enabled in its computer-use settings. Continuous observation requires a model that accepts images. Keyboard and mouse control can stay off.
2. Set the in-game aspect ratio under observation and calibration. The default is **16:10**. Open your own player profile and use ID calibration to locate the card in the lower right. If the text is unclear, the plugin enlarges the relevant part of the same screenshot and reads it again. Check the full name before clicking **Save ID**. You can also enter the name from the kill feed under player identification.
3. Click **One-click calibration** and switch to the Chinese solo or squad preparation screen within three seconds. Review the estimated regions and confirm within 60 seconds. For the loot region, repeat with the safe-box title and full grid visible. On Windows, you can also press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F8</kbd> in game when the panel shows the shortcut is registered.
4. If the suggested regions need adjustment, open detailed settings, make the change and return to quick setup. Saved settings carry over to the next session. Use the pause control to end capture. Recent events show recognition and delivery results. Combat detection ignores settings captions such as the Chinese heading for kill and knockdown recognition. Chinese OCR requires the Windows Chinese language pack. Calibration has been replayed on 16:9 and 16:10 imagery. Native 4:3 remains unverified.

Under **Player identification**, choose **Show debug log** to find the record and full-resolution screenshot for each ID calibration. Saving your ID successfully clears pending calibration screenshots and keeps the log. [ID calibration troubleshooting guide (Chinese)](documents/identity-debug-guide.md)

## Reactions and game notes

By default, eligible events have a 50% chance of waking Coo, with at least 45 seconds between ordinary game wakeups. Change the cooldown and eligible events in the panel. OCR runs locally. Event screenshots can reach the model provider configured in Coopanion when Coo responds.

Import a UTF-8 Markdown file under game knowledge to give Coo phrases or context for specific events. Use headings such as `## [kill] Kills` and `## [loot] Loot`. Reimport a file after editing it. [Built-in knowledge file](knowledge/delta-operations.md)

To end a session, stop observation. To uninstall, deactivate the World, remove it in Extensions and restart Coopanion.

## Development

Use Node.js 22 or later. From the repository root, install dependencies, run the tests, and typecheck. After a source change, rebuild and reload the extension in a compatible host.

```powershell
npm ci
npm test
npm run typecheck
npm run build
```

A community extension for [Coopanion](https://github.com/Pal-AI-Lab/Coopanion), built on [Cortico](https://github.com/Pal-AI-Lab/Cortico). [License](LICENSE)
