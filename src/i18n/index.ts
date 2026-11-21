/** Human-facing delta text follows the console request's language. */
import type { Language } from 'cortico/core/language.ts';
import zh, { type DeltaText } from './zh.ts';
import en from './en.ts';
import zhHant from './zh-Hant.ts';
import ja from './ja.ts';
import ko from './ko.ts';
import fr from './fr.ts';
import de from './de.ts';
import es419 from './es-419.ts';
import ptBR from './pt-BR.ts';
import it from './it.ts';
import ru from './ru.ts';

const TEXT: Record<Language, DeltaText> = { zh, en, 'zh-Hant': zhHant, ja, ko, fr, de, 'es-419': es419, 'pt-BR': ptBR, it, ru };
export type { DeltaText };
export function deltaText(language: Language = 'zh'): DeltaText { return TEXT[language] ?? TEXT.en; }
