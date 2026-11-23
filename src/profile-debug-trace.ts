import type { DeltaOcrBox as Box } from './ocr.ts';
import type { DeltaIdentitySuggestion } from './protocol.ts';

export type ProfileOcrField = 'overview' | 'profile-tab' | 'history-tab' | 'watermark' | 'player-number' | 'nickname';
export type ProfileTitleEvidence = 'exact' | 'history-confirmed' | 'history-unconfirmed' | 'no-match';
export type ProfileIconResult = 'badge-missing' | 'pencil-missing' | 'pencil-ambiguous' | 'no-ink'
  | 'ink-touches-edge' | 'icon-gap' | 'found';
export type ProfileNameReading = 'no-single-line' | 'invalid-text' | 'word-spacing' | 'conflict'
  | 'ink-edges-mismatch' | 'covers-ink' | 'corroborated';
export type ProfileFinishReason = 'ocr-error' | 'excluded-page' | 'overview-truncated' | 'legacy-label-unreadable'
  | 'no-selected-tab' | 'title-unconfirmed' | 'account-mismatch' | 'name-region-missing' | 'nickname-unreadable'
  | 'legacy-name-conflict' | 'card-candidate' | 'legacy-card-veto' | 'legacy-candidate';
type OcrAttempt = { field: ProfileOcrField; scale: 1 | 2; box: Box };

/** Boxes refer to the captured frame. OCR text and account values stay inside the recognizer. */
export type ProfileDebugEvent =
  | { stage: 'recognition-start'; deadline: number; remainingMs: number }
  | ({ stage: 'ocr-start'; width: number; height: number } & OcrAttempt)
  | ({ stage: 'ocr-result'; lineCount: number; truncated: boolean } & OcrAttempt)
  | ({ stage: 'ocr-skip'; reason: 'deadline' | 'scale-unavailable' | 'cached' } & OcrAttempt)
  | { stage: 'legacy'; status: DeltaIdentitySuggestion['status']; hasNicknameLabel: boolean }
  | { stage: 'viewport'; kind: 'hint' | 'measured' | 'whole'; box: Box; selectedGreenLine: boolean }
  | { stage: 'title'; evidence: ProfileTitleEvidence }
  | { stage: 'accounts'; hasAccount: boolean; hasPlayer: boolean; match: boolean | null }
  | { stage: 'name-icons'; result: ProfileIconResult }
  | { stage: 'name-region'; source: 'missing' }
  | { stage: 'name-region'; source: 'icons' | 'overview'; box: Box; ink: Box;
      paddingPx: { left: number; top: number; right: number; bottom: number } }
  | { stage: 'name-reading'; scale: 1 | 2; result: ProfileNameReading; leftErrorPx?: number; rightErrorPx?: number; tolerancePx?: number }
  | { stage: 'finish'; status: DeltaIdentitySuggestion['status']; reason: ProfileFinishReason;
      ocrCalls: number; localOcrStarted: boolean; deadlineSkipped: boolean };

export type ProfileDebugTrace = (event: ProfileDebugEvent) => void;
