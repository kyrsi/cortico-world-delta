/** One worker-owned OCR helper serializes combat and item-interface requests. */
import { createOcr, type DeltaOcrPort } from './ocr.ts';
import type { DeltaGameLanguage } from './protocol.ts';

export class SharedOcr {
  private port: Promise<DeltaOcrPort> | null = null;
  private language: DeltaGameLanguage = '';
  private tail: Promise<unknown> = Promise.resolve();
  private closed = false;
  private leases = 0;
  private retiring: Promise<void> | null = null;
  async open(language: DeltaGameLanguage): Promise<DeltaOcrPort> {
    if (this.closed) throw new Error('OCR service stopped');
    if (this.retiring) await this.retiring;
    if (this.closed) throw new Error('OCR service stopped');
    if (this.port && language !== this.language) throw new Error('OCR language conflict');
    if (!this.port) { this.language = language; this.port = createOcr(language); }
    const owned = this.port;
    this.leases++;
    let port: DeltaOcrPort;
    try { port = await owned; }
    catch (error) {
      if (this.port === owned && --this.leases === 0) { this.port = null; this.language = ''; }
      throw error;
    }
    if (this.closed || this.port !== owned) throw new Error('OCR service stopped');
    let released = false, release: Promise<void> | null = null;
    const recognizeLayout: DeltaOcrPort['recognizeLayout'] = (region) => {
      if (released || this.closed || this.port !== owned) return Promise.reject(new Error('OCR lease closed'));
      const request = this.tail.catch(() => {}).then(() => {
        if (released || this.closed || this.port !== owned) throw new Error('OCR lease closed');
        return port.recognizeLayout(region);
      });
      this.tail = request;
      return request;
    };
    return { ...port, recognizeLayout, async recognize(region) {
      const layout = await recognizeLayout(region);
      if (layout.truncated) throw new Error('OCR layout exceeds result limits');
      return layout.lines.map((line) => line.text);
    }, close: () => {
      if (released) return release ?? Promise.resolve();
      released = true;
      if (this.port !== owned || --this.leases > 0) return Promise.resolve();
      release = this.retire(owned);
      return release;
    } };
  }
  private retire(owned: Promise<DeltaOcrPort>): Promise<void> {
    this.port = null; this.language = ''; this.leases = 0;
    const work = this.tail;
    const retirement = (async () => {
      const port = await owned.catch(() => null);
      await port?.close();
      await work.catch(() => {});
    })().finally(() => { if (this.retiring === retirement) this.retiring = null; });
    this.retiring = retirement;
    return retirement;
  }
  async close(): Promise<void> {
    this.closed = true;
    if (this.port) await this.retire(this.port);
    else await this.retiring;
  }
}
