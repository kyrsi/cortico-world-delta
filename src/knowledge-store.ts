/** Imported Markdown is copied into this World's deployment data, never its package directory. */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { KnowledgeError, parseKnowledge, type KnowledgeDocument } from './knowledge.ts';
import { DELTA_KNOWLEDGE_MAX_CHARACTERS } from './limits.ts';
import type { DeltaKnowledgeState } from './protocol.ts';

export class KnowledgeStore {
  private readonly builtin: KnowledgeDocument;
  private readonly file: string | null;
  private document: KnowledgeDocument;
  private source: DeltaKnowledgeState['source'] = 'builtin';
  private loadedAt = new Date().toISOString();
  private lastError: DeltaKnowledgeState['lastError'] = null;

  constructor(dataDir?: string) {
    this.builtin = parseKnowledge(readFileSync(new URL('../knowledge/delta-operations.md', import.meta.url), 'utf8'), 'delta-operations.md');
    this.document = this.builtin;
    this.file = dataDir ? join(dataDir, 'worlds', 'delta', 'knowledge.json') : null;
    try { this.reload(); } catch { /* The built-in resource remains available when a saved import cannot load. */ }
  }
  current(): KnowledgeDocument { return this.document; }
  state(): DeltaKnowledgeState {
    return { source: this.source, name: this.document.name, version: this.document.version, bytes: this.document.bytes,
      characters: this.document.content.length, sections: this.document.sections.map(section => section.title),
      loadedAt: this.loadedAt, lastError: this.lastError, canImport: this.file !== null };
  }
  read(): { content: string; state: DeltaKnowledgeState } { return { content: this.document.content, state: this.state() }; }
  private activate(document: KnowledgeDocument, source: DeltaKnowledgeState['source']): void {
    this.document = document; this.source = source; this.loadedAt = new Date().toISOString(); this.lastError = null;
  }
  import(name: string, content: string): void {
    const document = parseKnowledge(content, name);
    if (!this.file) throw new Error('knowledge-unavailable');
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(temporary, JSON.stringify({ schema: 1, name: document.name, content: document.content }), { encoding: 'utf8', flag: 'wx' });
      renameSync(temporary, this.file);
    } catch {
      try { unlinkSync(temporary); } catch { /* A failed write may not have created the temporary file. */ }
      throw new Error('knowledge-write-failed');
    }
    this.activate(document, 'imported');
  }
  reload(): void {
    if (!this.file || !existsSync(this.file)) { this.activate(this.builtin, 'builtin'); return; }
    try {
      if (statSync(this.file).size > DELTA_KNOWLEDGE_MAX_CHARACTERS * 6 + 1024) throw new KnowledgeError('knowledge-too-large');
      const value = JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, unknown>;
      if (!value || value.schema !== 1 || typeof value.name !== 'string' || typeof value.content !== 'string') throw new KnowledgeError('knowledge-invalid');
      this.activate(parseKnowledge(value.content, value.name), 'imported');
    } catch (error) {
      this.lastError = error instanceof KnowledgeError ? error.code : 'knowledge-read-failed';
      throw new KnowledgeError(this.lastError);
    }
  }
  restore(): void {
    if (!this.file) throw new Error('knowledge-unavailable');
    try { if (existsSync(this.file)) unlinkSync(this.file); }
    catch { throw new Error('knowledge-write-failed'); }
    this.activate(this.builtin, 'builtin');
  }
}
