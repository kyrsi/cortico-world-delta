/** Accept, dedup, expiry, and deferred delivery for one observation generation. */
import { randomUUID } from 'node:crypto';
import type { BlobInput, EventEnvelope } from 'cortico/core/types.ts';
import type { CuaFrame } from 'cortico-world-desktop-pet';
import type { ChildToMain } from './engine-ipc.ts';
import { jpegSize } from './jpeg-size.ts';
import type { KnowledgeDocument } from './knowledge.ts';
import { selectKnowledge } from './knowledge.ts';
import { DELTA_MAX_HISTORY, DELTA_MAX_JPEG_BYTES } from './limits.ts';
import { lootNamespace, LootItemTracker } from './loot-detector.ts';
import { observationText } from './model-text.ts';
import { PersonalNotificationTracker, validPersonalSignature } from './personal-notification.ts';
import type { DeltaDetectionConfig, DeltaDropReason, DeltaEvent, DeltaKnowledgeState, DeltaLootCalibration, DeltaSimulationReceipt, DeltaSpeechConfig, DeltaState } from './protocol.ts';
import { evaluateSpeech } from './speech.ts';

interface Evidence { full: Uint8Array; crop: Uint8Array }
interface Wake { generation: number; token: string }

export interface EventQueueHost {
  frame(): CuaFrame | null;
  generation(): number;
  phase(): DeltaState['phase'];
  detection(): DeltaDetectionConfig;
  lootCalibration(): DeltaLootCalibration | null;
  ttlMs(): number;
  dedupMs(): number;
  maxPending(): number;
  speech(): DeltaSpeechConfig;
  random(): () => number;
  hasHost(): boolean;
  idle(): boolean;
  blocked(): boolean;
  modelLanguage(): 'zh' | 'en';
  knowledge(): KnowledgeDocument;
  knowledgeSource(): DeltaKnowledgeState['source'];
  reconcile(): void;
  expire(): void;
  pushDeferred(meta: Record<string, unknown>, render: () => { text: string; blobs: BlobInput[] } | null): void;
}

export class EventQueue {
  private readonly events: DeltaEvent[] = [];
  private pending: DeltaEvent[] = [];
  private readonly inflight = new Set<string>();
  private readonly images = new Map<string, Evidence>();
  private readonly seen = new Map<string, number>();
  private readonly personalNotifications = new PersonalNotificationTracker();
  private readonly lootItems = new LootItemTracker();
  private wake: Wake | null = null;
  private lastSelectedAtMs: number | null = null;
  private lastActivityAtMs: number | null = null;

  constructor(private readonly host: EventQueueHost) {}

  list(): DeltaEvent[] { return this.events; }
  pendingCount(): number { return this.pending.length; }
  imageCount(): number { return this.images.size; }
  stored(eventId: string): Evidence | undefined { return this.images.get(eventId); }
  selectedAtMs(): number | null { return this.lastSelectedAtMs; }
  activityAtMs(): number | null { return this.lastActivityAtMs; }
  noteActivity(now: number): void { this.lastActivityAtMs = now; }
  resetClock(): void { this.lastSelectedAtMs = null; this.lastActivityAtMs = null; }
  clearWake(): void { this.wake = null; }
  observeLoot(namespace: string, signatures: readonly Uint8Array[], now: number): void { this.lootItems.observe(namespace, signatures, now); }

  clear(reason: DeltaDropReason, preserveDedup = false): void {
    for (const event of this.events) if (event.status === 'queued') this.drop(event, reason);
    this.pending = []; this.images.clear(); this.inflight.clear();
    if (!preserveDedup) { this.seen.clear(); this.personalNotifications.clear(); this.lootItems.clear(); }
  }

  accept(message: Extract<ChildToMain, { kind: 'event' }>): Omit<DeltaSimulationReceipt, 'state'> {
    const { frame, jpeg: full } = message.capture, crop = message.crop;
    const time = Date.parse(frame.capturedAt), now = Date.now();
    const current = this.host.frame();
    if (!current || frame.display.id !== current.display.id || frame.topologyRevision !== current.topologyRevision
      || !Number.isFinite(time) || time > now + 1000 || !['kill', 'knockdown', 'loot'].includes(message.eventKind)
      || full.byteLength > DELTA_MAX_JPEG_BYTES || message.cropJpeg.byteLength > DELTA_MAX_JPEG_BYTES
      || ![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger)
      || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > frame.width || crop.y + crop.height > frame.height) throw new Error('Invalid observation frame');
    const fullSize = jpegSize(full), cropSize = jpegSize(message.cropJpeg);
    if (!fullSize || !cropSize || fullSize.width !== frame.width || fullSize.height !== frame.height
      || cropSize.width !== crop.width || cropSize.height !== crop.height) throw new Error('Invalid image dimensions');
    const personal = !message.synthetic && message.recognition?.kind === 'personal-feedback-text' && message.eventKind !== 'loot';
    if (personal && !validPersonalSignature(message.personalSignature)) throw new Error('Invalid personal notification signature');
    const attribution = message.synthetic ? null : message.attribution ?? null;
    if (attribution && (!['self', 'teammate', 'unknown'].includes(attribution.relation)
      || !['actor-text', 'personal-feedback', 'assist-text', 'spectator-hud', 'unknown'].includes(attribution.basis)
      || typeof attribution.assisted !== 'boolean' || typeof attribution.spectating !== 'boolean')) throw new Error('Invalid observation attribution');
    const relation = attribution?.relation ?? 'unknown';
    const namespace = personal ? JSON.stringify([frame.display, frame.topologyRevision, this.host.detection(), relation]) : '';
    const loot = !message.synthetic && message.eventKind === 'loot', itemNamespace = loot ? lootNamespace(frame, this.host.lootCalibration()!) : '';
    const duplicateItem = loot && this.lootItems.has(itemNamespace, message.lootSignature!, now);
    const dedupKey = loot ? this.lootItems.identify(itemNamespace, message.lootSignature!, now)
      : personal ? this.personalNotifications.identify(namespace, message.eventKind as 'kill' | 'knockdown', message.personalSignature ?? null, now) : message.dedupKey;
    const event: DeltaEvent = { id: message.id, kind: message.eventKind, capturedAt: frame.capturedAt,
      validUntil: new Date(time + this.host.ttlMs()).toISOString(), generation: this.host.generation(),
      synthetic: message.synthetic, confidence: null, recognition: message.recognition, attribution, dedupKey, frame, crop, status: 'queued', dropReason: null };
    this.events.push(event);
    const seenKey = event.kind === 'loot' ? `${event.kind}:${event.dedupKey}` : `${event.kind}:${relation}:${event.dedupKey}`;
    if (Date.parse(event.validUntil) <= now) this.drop(event, 'expired');
    else if (duplicateItem || (this.seen.get(seenKey) ?? 0) > now) this.drop(event, 'duplicate');
    else {
      if (personal) this.personalNotifications.remember(namespace, message.eventKind as 'kill' | 'knockdown', message.personalSignature ?? null, dedupKey, now);
      if (loot) this.lootItems.remember(itemNamespace, message.lootSignature!, dedupKey, now);
      this.seen.set(seenKey, now + this.host.dedupMs());
      for (const [key, expires] of this.seen) if (expires <= now || this.seen.size > 256) this.seen.delete(key);
      const suppression = evaluateSpeech(this.host.speech(), event, { nowMs: now, lastSelectedAtMs: this.lastSelectedAtMs,
        lastActivityAtMs: this.lastActivityAtMs, random: this.host.random() });
      if (suppression) this.drop(event, suppression);
      else {
        while (this.pending.length >= this.host.maxPending()) this.drop(this.pending.shift()!, 'overflow');
        this.images.set(event.id, { full: new Uint8Array(full), crop: new Uint8Array(message.cropJpeg) });
        this.pending.push(event); this.scheduleWake();
      }
    }
    this.trimHistory();
    return { accepted: event.status !== 'dropped', reason: event.dropReason, eventId: event.id };
  }

  expire(now: number): void {
    for (const event of this.events) if (Date.parse(event.validUntil) <= now) {
      if (event.status === 'queued') this.drop(event, 'expired');
      this.images.delete(event.id);
    }
    this.pending = this.pending.filter((event) => event.status === 'queued');
  }

  scheduleWake(): void {
    if (!this.host.hasHost() || this.wake || !this.host.idle() || !this.pending.length || this.host.phase() !== 'running' || this.host.blocked()) return;
    const wake = { generation: this.host.generation(), token: randomUUID() }; this.wake = wake;
    const meta: Record<string, unknown> = { deltaEventIds: [] };
    this.host.pushDeferred(meta, () => {
      if (this.wake !== wake) return null;
      this.host.reconcile(); this.host.expire();
      this.wake = null;
      if (wake.generation !== this.host.generation() || this.host.phase() !== 'running' || this.host.blocked()) {
        queueMicrotask(() => this.scheduleWake()); return null;
      }
      const nowMs = Date.now(), config = this.host.speech();
      const batch = this.pending.splice(0).filter(event => {
        const suppression = evaluateSpeech({ ...config, probability: config.probability === 0 ? 0 : 1 }, event, { nowMs,
          lastSelectedAtMs: this.lastSelectedAtMs, lastActivityAtMs: this.lastActivityAtMs, random: () => 0 });
        if (suppression) this.drop(event, suppression);
        return suppression === null;
      });
      if (!batch.length) return null;
      if (batch.some(event => !event.synthetic)) this.lastSelectedAtMs = nowMs;
      meta.deltaEventIds = batch.map((event) => event.id);
      for (const event of batch) this.inflight.add(event.id);
      const blobs: BlobInput[] = [];
      for (const event of batch) {
        const images = this.images.get(event.id)!;
        for (const [index, bytes] of [images.full, images.crop].entries()) blobs.push({ bytes, mime: 'image/jpeg', fallbackText: `${event.id} ${index === 0 ? 'full' : 'crop'} frameId=${event.frame.frameId}` });
      }
      const knowledge = this.host.knowledge();
      return { text: observationText(batch, this.host.modelLanguage(), {
        knowledge: selectKnowledge(knowledge, batch), source: this.host.knowledgeSource(), name: knowledge.name,
        version: knowledge.version, style: config.style,
      }), blobs };
    });
  }

  settled(events: readonly EventEnvelope[], outcome: 'delivered' | 'discarded'): void {
    for (const envelope of events) {
      const ids = envelope.meta?.deltaEventIds;
      if (!Array.isArray(ids)) continue;
      for (const event of this.events) if (ids.includes(event.id) && event.status === 'queued') {
        this.inflight.delete(event.id);
        if (outcome === 'delivered') event.status = 'delivered'; else this.drop(event, 'policy-changed');
      }
    }
  }

  private drop(event: DeltaEvent, reason: DeltaDropReason): void { event.status = 'dropped'; event.dropReason = reason; this.images.delete(event.id); }
  private trimHistory(): void {
    const limit = Math.max(DELTA_MAX_HISTORY, this.host.maxPending());
    while (this.events.length > limit) {
      let index = this.events.findIndex((event) => event.status !== 'queued');
      if (index < 0) index = this.events.findIndex((event) => !this.inflight.has(event.id));
      if (index < 0) break;
      const removed = this.events.splice(index, 1)[0]!;
      if (removed.status === 'queued') this.drop(removed, 'overflow');
      this.pending = this.pending.filter((event) => event !== removed);
      this.images.delete(removed.id);
    }
  }
}
