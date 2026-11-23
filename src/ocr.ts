/** Windows OCR runs in one hidden system PowerShell process and receives only bounded ROI pixels. */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { CapturedRegion } from 'cortico-world-desktop-pet/capture';
import type { DeltaGameLanguage } from './protocol.ts';
import { DELTA_MAX_ROI_PIXELS } from './limits.ts';

export const DELTA_OCR_LIMITS = { maxLines: 64, maxWords: 512, maxLineChars: 1024, maxWordChars: 128 } as const;
/** Boxes use pixels from the top-left corner of the unmodified input ROI. */
export interface DeltaOcrBox { x: number; y: number; width: number; height: number }
export interface DeltaOcrWord { text: string; box: DeltaOcrBox }
export interface DeltaOcrLine { text: string; box: DeltaOcrBox; words: readonly DeltaOcrWord[] }
export interface DeltaOcrLayout { width: number; height: number; lines: readonly DeltaOcrLine[]; truncated: boolean }
export interface DeltaOcrPort {
  pid: number;
  availableLanguages: string[];
  language: string | null;
  /** Resolves when the OCR process has exited. */
  exited: Promise<void>;
  recognize(region: CapturedRegion): Promise<readonly string[]>;
  recognizeLayout(region: CapturedRegion): Promise<DeltaOcrLayout>;
  close(): Promise<void>;
}
const OCR_PLATFORM_UNAVAILABLE = 'Windows OCR is unavailable on this platform';
export function ocrUnavailableOnPlatform(error: unknown): boolean {
  return error instanceof Error && error.message === OCR_PLATFORM_UNAVAILABLE;
}
export function ocrProcessGone(error: unknown): boolean {
  return error instanceof Error && (error.message === 'Windows OCR timed out' || error.message === 'Windows OCR exited'
    || error.message === 'Windows OCR is closed' || error.message === 'Windows OCR stopped');
}

const script = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
try {
  Add-Type -TypeDefinition 'using System; using System.Diagnostics; using System.Threading; public static class DeltaOcrLifetime { private static Timer timer; public static void Watch(int id) { var owner = Process.GetProcessById(id); timer = new Timer(_ => { try { if (owner.HasExited) Environment.Exit(0); } catch { Environment.Exit(0); } }, null, 500, 500); } }'
  [DeltaOcrLifetime]::Watch(__PARENT_PID__)
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
  $null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType=WindowsRuntime]
  $null = [Windows.Security.Cryptography.CryptographicBuffer, Windows.Security.Cryptography, ContentType=WindowsRuntime]
  $available = @([Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | ForEach-Object { $_.LanguageTag })
  $requested = '__LANGUAGE__'
  $tag = $available | Where-Object { if ($requested -eq 'en-US') { $_ -like 'en-*' } else { $_ -like 'zh-Hans*' -or $_ -eq 'zh-CN' -or $_ -eq 'zh-SG' } } | Select-Object -First 1
  $engine = $null
  if ($tag) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language($tag))) }
  $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation' + [char]96 + '1' } | Select-Object -First 1
  @{kind='ready'; availableLanguages=$available; language=$tag} | ConvertTo-Json -Compress
  $reader = New-Object System.IO.BinaryReader([Console]::OpenStandardInput())
  $magic = [uint32]0x52434F44
  $max = [uint64][Windows.Media.Ocr.OcrEngine]::MaxImageDimension
  while ($true) {
    try { $header = $reader.ReadBytes(16) } catch { exit 1 }
    if ($header.Length -eq 0) { break }
    if ($header.Length -ne 16) { exit 1 }
    $width = [uint64]([BitConverter]::ToUInt32($header, 4))
    $height = [uint64]([BitConverter]::ToUInt32($header, 8))
    $length = [uint64]([BitConverter]::ToUInt32($header, 12))
    if ([BitConverter]::ToUInt32($header, 0) -ne $magic -or $width -lt 1 -or $height -lt 1 -or $width -gt $max -or $height -gt $max -or $length -ne ($width * $height * [uint64]4) -or $length -gt [uint64][int]::MaxValue) { exit 1 }
    try { $bytes = $reader.ReadBytes([int]$length) } catch { exit 1 }
    if ($bytes.Length -ne $length) { exit 1 }
    $bitmap = $null
    try {
      if (!$engine) { throw 'The requested OCR language is unavailable' }
      $bitmap = New-Object Windows.Graphics.Imaging.SoftwareBitmap([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,[int]$width,[int]$height,[Windows.Graphics.Imaging.BitmapAlphaMode]::Ignore)
      $bitmap.CopyFromBuffer([System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeBufferExtensions]::AsBuffer($bytes))
      $task = $asTask.MakeGenericMethod([Windows.Media.Ocr.OcrResult]).Invoke($null,@($engine.RecognizeAsync($bitmap)))
      $task.Wait()
      $layout = New-Object 'Collections.Generic.List[object]'
      $wordCount = 0
      $truncated = $false
      foreach ($ocrLine in $task.Result.Lines) {
        if ($layout.Count -ge __MAX_LINES__) { $truncated = $true; break }
        $words = New-Object 'Collections.Generic.List[object]'
        foreach ($word in $ocrLine.Words) {
          if ($wordCount -ge __MAX_WORDS__) { $truncated = $true; break }
          $text = [string]$word.Text
          if ($text.Length -gt __MAX_WORD_CHARS__) { $text = $text.Substring(0,__MAX_WORD_CHARS__); $truncated = $true }
          $rect = $word.BoundingRect
          $words.Add(@{text=$text; box=@{x=$rect.X; y=$rect.Y; width=$rect.Width; height=$rect.Height}})
          $wordCount++
        }
        if (!$words.Count) { if ($truncated) { break } else { continue } }
        $text = [string]$ocrLine.Text
        if ($text.Length -gt __MAX_LINE_CHARS__) { $text = $text.Substring(0,__MAX_LINE_CHARS__); $truncated = $true }
        $layout.Add(@{text=$text; words=@($words.ToArray())})
      }
      @{kind='result'; textAngle=$task.Result.TextAngle; lines=@($layout.ToArray()); truncated=$truncated} | ConvertTo-Json -Compress -Depth 8
    } catch { @{kind='error'; message=$_.Exception.Message} | ConvertTo-Json -Compress }
    finally { if ($bitmap) { $bitmap.Dispose() } }
  }
} catch { @{kind='error'; message=$_.Exception.Message} | ConvertTo-Json -Compress; exit 1 }
`;

function union(boxes: readonly DeltaOcrBox[]): DeltaOcrBox {
  const x = Math.min(...boxes.map((box) => box.x)), y = Math.min(...boxes.map((box) => box.y));
  return { x, y, width: Math.max(...boxes.map((box) => box.x + box.width)) - x, height: Math.max(...boxes.map((box) => box.y + box.height)) - y };
}

function sourceBox(value: unknown, width: number, height: number, angle: number): DeltaOcrBox {
  const box = value as DeltaOcrBox;
  if (!box || ![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) throw new Error('Invalid Windows OCR box');
  const radians = angle * Math.PI / 180, cosine = Math.cos(radians), sine = Math.sin(radians);
  const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]];
  const rotated = corners.map(([x, y]) => ({ x: width / 2 + (x! - width / 2) * cosine - (y! - height / 2) * sine,
    y: height / 2 + (x! - width / 2) * sine + (y! - height / 2) * cosine }));
  const x = Math.max(0, Math.min(width, Math.min(...rotated.map((corner) => corner.x))));
  const y = Math.max(0, Math.min(height, Math.min(...rotated.map((corner) => corner.y))));
  return { x, y, width: Math.max(0, Math.min(width, Math.max(...rotated.map((corner) => corner.x))) - x),
    height: Math.max(0, Math.min(height, Math.max(...rotated.map((corner) => corner.y))) - y) };
}

function parseLayout(value: Record<string, unknown>, region: CapturedRegion): DeltaOcrLayout {
  const angle = value.textAngle === null ? 0 : value.textAngle;
  if (typeof angle !== 'number' || !Number.isFinite(angle) || !Array.isArray(value.lines) || value.lines.length > DELTA_OCR_LIMITS.maxLines
    || typeof value.truncated !== 'boolean') throw new Error('Invalid Windows OCR layout');
  const result: DeltaOcrLayout = { width: region.width, height: region.height, lines: [], truncated: value.truncated };
  const lines: DeltaOcrLine[] = [];
  let wordCount = 0;
  for (const item of value.lines) {
    const line = item as { text: string; words: { text: string; box: unknown }[] };
    if (typeof line.text !== 'string' || line.text.length > DELTA_OCR_LIMITS.maxLineChars || !Array.isArray(line.words)) throw new Error('Invalid Windows OCR line');
    const words: DeltaOcrWord[] = [];
    for (const word of line.words) {
      if (++wordCount > DELTA_OCR_LIMITS.maxWords || typeof word.text !== 'string' || word.text.length > DELTA_OCR_LIMITS.maxWordChars) throw new Error('Invalid Windows OCR word');
      const box = sourceBox(word.box, region.width, region.height, angle);
      if (!box.width || !box.height) { result.truncated = true; continue; }
      words.push({ text: word.text, box });
    }
    if (words.length) lines.push({ text: line.text, words, box: union(words.map((word) => word.box)) });
    else result.truncated = true;
  }
  result.lines = lines;
  return result;
}

export async function createOcr(language: DeltaGameLanguage): Promise<DeltaOcrPort> {
  if (language !== 'zh-CN' && language !== 'en-US') throw new Error('Unsupported OCR language');
  if (process.platform !== 'win32') throw new Error(OCR_PLATFORM_UNAVAILABLE);
  const source = script.replace('__LANGUAGE__', language).replace('__PARENT_PID__', String(process.pid))
    .replaceAll('__MAX_LINES__', String(DELTA_OCR_LIMITS.maxLines)).replaceAll('__MAX_WORDS__', String(DELTA_OCR_LIMITS.maxWords))
    .replaceAll('__MAX_LINE_CHARS__', String(DELTA_OCR_LIMITS.maxLineChars)).replaceAll('__MAX_WORD_CHARS__', String(DELTA_OCR_LIMITS.maxWordChars));
  const command = Buffer.from(source, 'utf16le').toString('base64');
  const child: ChildProcessWithoutNullStreams = spawn(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', command], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let closed = false;
  let markExited = () => {};
  const exited = new Promise<void>((resolve) => { markExited = resolve; });
  let pending: { resolve(value: Record<string, unknown>): void; reject(error: Error): void; timer: NodeJS.Timeout } | null = null;
  const fail = (error: Error) => { if (pending) { clearTimeout(pending.timer); pending.reject(error); pending = null; } };
  const response = (timeoutMs: number) => new Promise<Record<string, unknown>>((resolve, reject) => {
    pending = { resolve, reject, timer: setTimeout(() => { fail(new Error('Windows OCR timed out')); child.kill(); }, timeoutMs) };
  });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    if (!pending || line.length > 1024 * 1024) return;
    try {
      const value = JSON.parse(line) as Record<string, unknown>;
      if (value.kind === 'error') { fail(new Error(String(value.message))); return; }
      const request = pending; pending = null; clearTimeout(request.timer); request.resolve(value);
    } catch { fail(new Error('Invalid Windows OCR response')); }
  });
  child.stderr.on('data', () => {});
  // A framing failure closes the pipe while the body is still being written.
  child.stdin.on('error', (error) => {
    const code = 'code' in error ? error.code : undefined;
    if (code !== 'EOF' && code !== 'EPIPE') fail(error);
  });
  child.on('error', (error) => fail(error));
  child.on('exit', () => { closed = true; markExited(); fail(new Error('Windows OCR exited')); });
  const close = async () => {
    if (closed) return;
    closed = true; fail(new Error('Windows OCR stopped')); lines.close(); child.stdin.end();
    const stopped = new Promise<void>((done) => child.once('exit', () => done()));
    const timer = setTimeout(() => child.kill(), 250);
    await Promise.race([stopped, new Promise<void>((done) => setTimeout(done, 500))]);
    clearTimeout(timer); if (child.exitCode === null) child.kill();
  };
  let ready: Record<string, unknown>;
  try { ready = await response(8000); } catch (error) { await close(); throw error; }
  const recognizeLayout = async (region: CapturedRegion): Promise<DeltaOcrLayout> => {
      if (closed) throw new Error('Windows OCR is closed');
      if (region.width * region.height > DELTA_MAX_ROI_PIXELS || region.bgra.byteLength !== region.width * region.height * 4) throw new Error('OCR region exceeds pixel limit');
      if (pending) throw new Error('Windows OCR already has a request');
      const result = response(3000);
      // uint32 magic 0x52434F44, width, height, byte length, then raw BGRA. A bad frame ends the helper.
      const header = Buffer.allocUnsafe(16);
      header.writeUInt32LE(0x52434F44, 0);
      header.writeUInt32LE(region.width, 4);
      header.writeUInt32LE(region.height, 8);
      header.writeUInt32LE(region.bgra.byteLength, 12);
      child.stdin.cork();
      child.stdin.write(header);
      child.stdin.write(region.bgra);
      child.stdin.uncork();
      const value = await result;
      return parseLayout(value, region);
  };
  return { pid: child.pid!, availableLanguages: Array.isArray(ready.availableLanguages) ? ready.availableLanguages.map(String) : [],
    language: typeof ready.language === 'string' ? ready.language : null, exited, recognizeLayout,
    async recognize(region) {
      const layout = await recognizeLayout(region);
      if (layout.truncated) throw new Error('Windows OCR layout exceeds result limits');
      return layout.lines.map((line) => line.text);
    }, close };
}
