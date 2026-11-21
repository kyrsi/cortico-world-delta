/** Markdown parsing and event selection are independent of storage and the active World. */
import { createHash } from 'node:crypto';
import { DELTA_KNOWLEDGE_CONTEXT_MAX_CHARACTERS, DELTA_KNOWLEDGE_MAX_BYTES, DELTA_KNOWLEDGE_MAX_CHARACTERS, DELTA_KNOWLEDGE_MAX_SECTIONS } from './limits.ts';
import type { DeltaEvent, DeltaKnowledgeError } from './protocol.ts';

const SECTION_IDS = new Set(['general', 'kill', 'knockdown', 'loot', 'self', 'teammate', 'unknown']);
export interface KnowledgeSection { id: string; title: string; content: string }
export interface KnowledgeDocument { name: string; content: string; bytes: number; version: string; sections: KnowledgeSection[] }
export class KnowledgeError extends Error {
  constructor(readonly code: DeltaKnowledgeError) { super(code); }
}

export function parseKnowledge(content: string, name = 'knowledge.md'): KnowledgeDocument {
  if (typeof content !== 'string' || typeof name !== 'string' || !/^[^\\/:\r\n\0]{1,125}\.md$/i.test(name)
    || !content.trim() || /[\0\uFFFD]/.test(content) || Buffer.from(content).toString('utf8') !== content) throw new KnowledgeError('knowledge-invalid');
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > DELTA_KNOWLEDGE_MAX_BYTES || content.length > DELTA_KNOWLEDGE_MAX_CHARACTERS) throw new KnowledgeError('knowledge-too-large');
  const sections: KnowledgeSection[] = [];
  let section: KnowledgeSection = { id: 'general', title: 'general', content: '' };
  let fenced = false;
  for (const line of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = !fenced && /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      if (section.content.trim() || sections.length) sections.push({ ...section, content: section.content.trim() });
      const title = heading[1]!.trim(), key = (/^\[([a-z]+)\](?:\s|$)/i.exec(title)?.[1] ?? title).toLowerCase();
      section = { id: SECTION_IDS.has(key) ? key : 'unmatched', title, content: '' };
    } else section.content += `${line}\n`;
  }
  if (section.content.trim() || sections.length) sections.push({ ...section, content: section.content.trim() });
  if (sections.length > DELTA_KNOWLEDGE_MAX_SECTIONS) throw new KnowledgeError('knowledge-too-large');
  if (!sections.length) throw new KnowledgeError('knowledge-invalid');
  return { name, content, bytes, version: createHash('sha256').update(content).digest('hex').slice(0, 12), sections };
}

export function selectKnowledge(document: KnowledgeDocument, events: readonly DeltaEvent[]): string {
  const keys = new Set<string>(['general']);
  for (const event of events) {
    keys.add(event.kind);
    if (event.kind !== 'loot') keys.add(event.synthetic ? 'unknown' : event.attribution?.relation ?? 'unknown');
  }
  const pieces: string[] = [];
  let remaining = DELTA_KNOWLEDGE_CONTEXT_MAX_CHARACTERS;
  for (const section of document.sections) {
    if (!keys.has(section.id) || !section.content || remaining <= 0) continue;
    const piece = `## ${section.title}\n${section.content}`.slice(0, Math.min(remaining, section.id === 'general' ? 1500 : 2000));
    pieces.push(piece); remaining -= piece.length + 2;
  }
  return pieces.join('\n\n');
}
