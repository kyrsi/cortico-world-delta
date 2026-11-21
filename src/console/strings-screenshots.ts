import type { Language } from 'cortico/core/language.ts';

const en = { reveal: 'Open file location', failed: 'Could not open the screenshot file location.' };
const TEXT: Record<Language, typeof en> = {
  en,
  zh: { reveal: '打开文件所在位置', failed: '无法打开截图文件所在位置。' },
  'zh-Hant': { reveal: '開啟檔案所在位置', failed: '無法開啟螢幕截圖檔案所在位置。' },
  ja: { reveal: 'ファイルの場所を開く', failed: 'スクリーンショットの保存先を開けませんでした。' },
  ko: { reveal: '파일 위치 열기', failed: '스크린샷 파일 위치를 열 수 없습니다.' },
  fr: { reveal: 'Ouvrir l’emplacement du fichier', failed: 'Impossible d’ouvrir l’emplacement de la capture d’écran.' },
  de: { reveal: 'Dateispeicherort öffnen', failed: 'Der Speicherort des Screenshots konnte nicht geöffnet werden.' },
  'es-419': { reveal: 'Abrir la ubicación del archivo', failed: 'No se pudo abrir la ubicación del archivo de captura.' },
  'pt-BR': { reveal: 'Abrir local do arquivo', failed: 'Não foi possível abrir o local do arquivo da captura.' },
  it: { reveal: 'Apri percorso file', failed: 'Impossibile aprire il percorso del file della schermata.' },
  ru: { reveal: 'Открыть расположение файла', failed: 'Не удалось открыть расположение файла снимка экрана.' },
};

export function screenshotText(language: Language): typeof en { return TEXT[language]; }
