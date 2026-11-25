import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { powershellExecutable } from './powershell.ts';
import type { DeltaCalibrationHotkeyPort } from './protocol.ts';

const source = fileURLToPath(new URL('../src/standalone/CalibrationHotkey.cs', import.meta.url));
const script = "$ErrorActionPreference = 'Stop'\nAdd-Type -TypeDefinition ([IO.File]::ReadAllText($env:DELTA_HOTKEY_SOURCE))\n[DeltaObservation.CalibrationHotkey]::Run()";
let retiring: Promise<void> = Promise.resolve();

export const windowsCalibrationHotkey: DeltaCalibrationHotkeyPort = {
  register(onPress, onStatus) {
    let released = false;
    let child: ChildProcessWithoutNullStreams | undefined;
    let exited: Promise<void>;
    void retiring.then(() => {
      if (released) return;
      const command = powershellExecutable();
      const helper = spawn(command, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true, env: { ...process.env, DELTA_HOTKEY_SOURCE: source }, stdio: ['pipe', 'pipe', 'pipe'],
      });
      child = helper;
      let occupied = false;
      const startup = setTimeout(() => helper.kill(), 12_000);
      helper.stderr.resume();
      helper.stdin.on('error', () => {}); // A short-lived or occupied registration can exit before release.
      helper.on('error', () => {}); // The close event also follows an unsuccessful spawn.
      const lines = createInterface({ input: helper.stdout });
      lines.on('line', line => {
        if (released) return;
        if (line === 'pressed') { onPress(); return; }
        if (line === 'registered' || line === 'occupied' || line === 'unavailable') {
          clearTimeout(startup);
          occupied = line === 'occupied';
          onStatus(line);
        }
      });
      exited = new Promise<void>(resolve => helper.once('close', () => {
        clearTimeout(startup);
        child = undefined;
        if (!released && !occupied) onStatus('unavailable');
        resolve();
      }));
    }).catch(() => { if (!released) onStatus('unavailable'); });
    return () => {
      released = true;
      if (!child) return;
      const helper = child;
      retiring = exited;
      helper.stdin.end();
      const force = setTimeout(() => helper.kill(), 1000);
      void exited.then(() => clearTimeout(force));
    };
  },
};
