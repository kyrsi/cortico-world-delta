<p align="center">
  <img src="documents/assets/game-observer.svg" alt="Game observer, a small fish spotting a red loot tile" width="960">
</p>

<h1 align="center">Game observer</h1>
<p align="center">Bring Coo along on your next Delta Force Operations raid.</p>
<p align="center"><a href="README.md" lang="zh-CN">简体中文</a> · English</p>
<p align="center"><code>0.1.16</code> · <code>Windows</code> · <code>Cortico World API 6</code> · <a href="LICENSE">AGPL-3.0-or-later</a></p>

Game observer watches the monitor you select, reads combat notifications with Windows OCR and looks for red-tier loot candidates in inventory and container grids. Coo can react to an event with its screenshot and your own game notes. Your pet can stay on one monitor while you play on another.

## Host compatibility

Local version 0.1.16 adds a Windows adapter for stock Coopanion. Binding and display enumeration were verified on the official 0.2.25 installer build. Capture components resolve relative to the host package rather than a fixed install path; the portable distribution still needs its own runtime test. The adapter uses an internal host capture interface, so future host updates require compatibility checks.

Choose a display and grant continuous viewing in the runtime panel before starting observation. Consent lasts for this session and is revoked by Stop or restart. This reads the selected display without enabling keyboard or mouse control. Core delivery pause does not replace Stop observation. Model reactions require image support. Use the panel calibration button; the global shortcut requires extra host integration. Existing customized host bindings remain supported.

## Install

Choose **Code → Download ZIP** on GitHub and extract it, or clone the repository with Git.

```powershell
git clone https://github.com/kyrsi/cortico-world-delta.git
```

In the compatible host, open **Settings → Extensions** and install from the local directory containing `package.json`, `describe.json` and `dist`. The compiled plugin is included. Keep that folder in place. Restart Coopanion, activate the World in advanced mode, then open its observer panel.

## First raid

1. On stock Coopanion, select your gaming display and grant access in the runtime panel. Customized hosts retain their own computer-use viewing policy and display selection. Install the Windows OCR language for the game text you want to read.
2. Enter your full in-game nickname under combat recognition. Set the game aspect ratio under observation and calibration. The default is **16:10**.
3. Open the Chinese solo or squad preparation screen, click One-click calibration, then switch back to the game within three seconds. The PC example in the panel shows the required screen and observation areas. Successful calibration saves automatically and keeps the captured screenshot, observation boxes and success indicator below the controls for review. If calibration fails, retry or adjust the regions manually. To measure the loot region on the current frame, repeat with the entire safe-box title and grid visible. You can also press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F8</kbd> when your host supports the global shortcut.
4. Enable the detectors you want in Configuration, then select Start observation in the runtime panel. Its start, pause and stop buttons control observation; Configuration contains recognition and capture settings. Recent events distinguish kills from knockdowns and record self, teammate or unknown attribution. Red-tier candidates still need visual confirmation. The calibration workflow was replayed on 16:9 and 16:10 imagery. Native 4:3 remains unverified.

## Reactions and game notes

By default, eligible events have a 50% chance of waking Coo, with at least 45 seconds between ordinary game wakeups. Change the cooldown and eligible events in the panel. OCR runs locally. Event screenshots can reach the model provider configured in Coopanion when Coo responds.

Import a UTF-8 Markdown file under game knowledge to give Coo phrases or context for specific events. Use headings such as `## [kill] Kills` and `## [loot] Loot`. Reimport a file after editing it. [Built-in knowledge file](knowledge/delta-operations.md)

To end a session, stop observation. To uninstall, deactivate the World, remove it in Extensions and restart Coopanion.

## Development

Use Node.js 22 or later to rebuild the extension from the repository root.

```powershell
npm ci
npm run build
```

A community extension for [Coopanion](https://github.com/Pal-AI-Lab/Coopanion), built on [Cortico](https://github.com/Pal-AI-Lab/Cortico). [License](LICENSE)
