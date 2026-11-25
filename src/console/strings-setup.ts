import type { Language } from 'cortico/core/language.ts';

type SetupLabels = readonly [title: string, channels: string, fix: string, details: string, back: string, ready: string, grant: string];
const labels: Record<Language, SetupLabels> = {
  zh: ['一键配置', '请至少选择一项识别功能', '快速配置', '具体配置', '返回一键配置', '配置已就绪', '允许读取此屏用于校准'],
  'zh-Hant': ['一鍵設定', '請至少選擇一項辨識功能', '快速設定', '詳細設定', '返回一鍵設定', '設定已就緒', '允許讀取此螢幕以校準'],
  en: ['Quick setup', 'Select at least one recognition channel', 'Set up', 'Detailed settings', 'Back to quick setup', 'Ready to observe', 'Allow this screen for calibration'],
  ja: ['かんたん設定', '認識する項目を1つ以上選択してください', '設定する', '詳細設定', 'かんたん設定に戻る', '設定が完了しました', '調整のためにこの画面の読み取りを許可'],
  ko: ['빠른 설정', '인식 항목을 하나 이상 선택하세요', '설정하기', '상세 설정', '빠른 설정으로 돌아가기', '설정 완료', '보정을 위해 이 화면 읽기 허용'],
  fr: ['Configuration rapide', 'Sélectionnez au moins un type de détection', 'Configurer', 'Réglages détaillés', 'Revenir à la configuration rapide', 'Configuration prête', 'Autoriser cet écran pour le calibrage'],
  de: ['Schnelleinrichtung', 'Mindestens eine Erkennungsart auswählen', 'Einrichten', 'Detaileinstellungen', 'Zurück zur Schnelleinrichtung', 'Einrichtung abgeschlossen', 'Diesen Bildschirm zur Kalibrierung zulassen'],
  'es-419': ['Configuración rápida', 'Selecciona al menos un tipo de detección', 'Configurar', 'Ajustes detallados', 'Volver a la configuración rápida', 'Configuración lista', 'Permitir esta pantalla para la calibración'],
  'pt-BR': ['Configuração rápida', 'Selecione pelo menos um tipo de detecção', 'Configurar', 'Ajustes detalhados', 'Voltar à configuração rápida', 'Configuração pronta', 'Permitir esta tela para calibração'],
  it: ['Configurazione rapida', 'Seleziona almeno un tipo di rilevamento', 'Configura', 'Impostazioni dettagliate', 'Torna alla configurazione rapida', 'Configurazione pronta', 'Consenti questo schermo per la calibrazione'],
  ru: ['Быстрая настройка', 'Выберите хотя бы один вид распознавания', 'Настроить', 'Подробные настройки', 'К быстрой настройке', 'Настройка завершена', 'Разрешить чтение экрана для калибровки'],
};
export function setupText(language: Language) {
  const [title, channels, fix, details, back, ready, grant] = labels[language];
  return { title, channels, fix, details, back, ready, grant };
}
