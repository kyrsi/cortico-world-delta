<p align="center">
  <img src="documents/assets/game-observer.svg" alt="Game observer, a small fish spotting a red loot tile" width="960">
</p>

<h1 align="center">Game observer</h1>
<p align="center">Let Coo check kill notifications and the safe box in Delta Force at regular intervals.</p>
<p align="center"><a href="README.md" lang="zh-CN">简体中文</a> · English</p>
<p align="center"><code>1.3.0</code> · <code>Windows</code> · <code>Cortico World API 6</code> · <a href="LICENSE">AGPL-3.0-or-later</a></p>

Game observer watches the monitor you select, reads combat notifications with Windows OCR and looks for red-tier loot candidates in inventory and container grids. Coo can react to an event with its screenshot and your own game notes. Your pet can stay on one monitor while you play on another.

## Host compatibility

- **Stock Coopanion 0.2.23 on Windows** uses the World’s own screen capture. Choose a monitor and grant access in the observer panel. Pausing Coo does not stop standalone screen capture; that pause still controls event delivery. Pause or stop observation in the panel to stop capturing. Either action, or a Core restart, ends the grant.
- **Customized Coopanion 0.2.22 with the observer binding** uses the host’s monitor selection, viewing policy and registered calibration shortcut. [World binding interface](src/protocol.ts)

## Install

The Git version is 1.3.0 and has not been published to npm. Public version 1.2.0 has been withdrawn; use the local installation steps below.

1. Extract the local trial package and use advanced mode **Extensions → Install from local directory**. Select the folder containing `package.json`, `describe.json` and `dist`, and keep it in place. Run `npm run build` first when installing from source.
2. Restart when prompted, activate **Game observer** under **My Worlds** and open the observer panel.

## First raid

1. **Click Start observation.** A white exclamation means configuration is incomplete or screen permission is missing, and an arrow appears beside the status title. Incomplete configuration opens Quick setup from the button, and the arrow goes straight to the first missing item. With World capture and complete configuration, both open the display choice. Choose combat or loot detection and save the game language. Missing-item shortcuts stay in Quick setup; open detailed settings when manual changes are needed.
2. **Choose the game display and aspect ratio.** The default is **16:10**. Grant access, open the Chinese solo or squad preparation screen, click One-click calibration and return to the game within three seconds. Successful calibration saves automatically and retains its screenshot, timestamp and region overlays. The registered <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F8</kbd> shortcut also saves without an open panel.
3. **Capture again when needed.** Preparation-screen regions are estimates. For a measured safe-box region, show its title and complete borders in the inventory. Failures show a red exclamation and a shortcut to manual settings, retaining the available screenshot. Successful previews remain in the current panel; right-click export is still limited by server preview expiry.
4. **The nickname is optional.** Player identification offers manual entry and save. Automatic ID calibration has been removed from the panel. Personal notifications establish the player’s action, while assists and spectating retain teammate attribution. The optional nickname helps check the upper-right feed. An unmatched target is not automatically an AI soldier.
5. **Press play when ready.** The exclamation changes to play once the screen is permitted and configuration is complete, and to pause after starting. Starting again or restarting Core requires screen permission again and restores the exclamation; with World capture, the arrow beside the permission status opens the display choice. Pause or stop ends capture. Recent events show recognition and delivery results. Chinese notifications require Windows Chinese OCR, and observation requires an image-capable model.

Calibration has been replayed on 16:9 and 16:10 imagery. Native 4:3 remains unverified. Synthetic tests cover safe-box outer boundaries, capacity headings and red candidates in every slot for 1×2, 2×2 and 2×3; complete real-game footage for each size still needs validation. [Configuration and coverage notes (Chinese)](documents/observation-setup.md)

One-click calibration includes a schematic of the preparation screen and observation areas. Check the actual regions in the captured preview. The saved marker and preview remain visible; closing the preview retains the saved regions.

Start and pause observation from the pinned top button. Quick setup and Configuration no longer provide duplicate observation controls.

Show debug log remains available only when historical ID logs exist. Saving a nickname clears retained historical ID frames. [Archived ID troubleshooting guide (Chinese)](documents/identity-debug-guide.md)

## Reactions and game notes

For loot candidates, Coo receives the game screen and the inventory crop from the same frame. It can check the slot’s rarity and look up reference pictures in the catalog. When the name is hard to read, it can request the original-resolution crop from that event, including any visible slot label. Coo identifies confirmed red loot as a red-quality Delta Force item and can qualify a guess about its name.

Open the [item review table](documents/loot-catalog-review.html) in a browser to confirm or correct names against their pictures. Coo can use every listed item immediately. Review progress is saved in the current browser. To apply corrections to the extension, export the catalog, replace `knowledge/red-items.json`, and rebuild. Reference pictures load online.

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
