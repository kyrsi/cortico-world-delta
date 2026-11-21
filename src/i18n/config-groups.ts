import type { Language } from 'cortico/core/language.ts';

const en = {
  observation: 'Observation and calibration', combat: 'Combat recognition', loot: 'Red-tier item recognition',
  speech: 'Event responses', advanced: 'Advanced', hotkey: 'In-game calibration shortcut',
  gameAspectRatio: 'Game aspect ratio', gameAspectRatioDescription: 'Used to narrow the search for controls in the screenshot.',
  hotkeyDescription: 'On Windows, press Ctrl+Shift+F8 on the deployment screen or with the safe box visible. Review the screenshot on the status page.',
};

const TEXT: Record<Language, typeof en> = {
  en,
  zh: {
    observation: '观察与校准', combat: '战斗识别', loot: '出红识别', speech: '事件回应', advanced: '高级', hotkey: '游戏内校准快捷键',
    gameAspectRatio: '游戏画面比例', gameAspectRatioDescription: '选用游戏里的显示区域宽高比，帮助定位截图中的控件。',
    hotkeyDescription: '在 Windows 的出发准备页或安全箱可见时按 Ctrl+Shift+F8，再到运行状态页核对截图。',
  },
  'zh-Hant': {
    observation: '觀察與校準', combat: '戰鬥辨識', loot: '紅色品質物品辨識', speech: '事件回應', advanced: '進階', hotkey: '遊戲內校準快捷鍵',
    gameAspectRatio: '遊戲畫面比例', gameAspectRatioDescription: '選用遊戲的顯示區域寬高比，協助定位截圖中的控制項。',
    hotkeyDescription: '在 Windows 的出發準備頁或保險箱可見時按 Ctrl+Shift+F8，再到執行狀態頁核對截圖。',
  },
  ja: {
    observation: '観察と調整', combat: '戦闘の認識', loot: '赤ランクアイテムの認識', speech: 'イベントへの反応', advanced: '詳細設定', hotkey: 'ゲーム内の調整ショートカット',
    gameAspectRatio: 'ゲーム画面の縦横比', gameAspectRatioDescription: 'ゲームの表示領域の縦横比に合わせると、画面内の項目を探しやすくなります。',
    hotkeyDescription: 'Windows では出撃準備画面かセーフボックスを表示して Ctrl+Shift+F8 を押し、状態ページで確認してください。',
  },
  ko: {
    observation: '관찰 및 보정', combat: '전투 인식', loot: '빨간색 등급 아이템 인식', speech: '이벤트 반응', advanced: '고급', hotkey: '게임 내 보정 단축키',
    gameAspectRatio: '게임 화면 비율', gameAspectRatioDescription: '게임의 표시 영역 비율을 선택하면 화면에서 항목을 찾는 데 도움이 됩니다.',
    hotkeyDescription: 'Windows에서 출발 준비 화면이나 보안 상자가 보일 때 Ctrl+Shift+F8을 누른 후 상태 페이지에서 확인하세요.',
  },
  fr: {
    observation: 'Observation et calibrage', combat: 'Reconnaissance des combats', loot: 'Reconnaissance des objets rouges', speech: 'Réactions aux événements', advanced: 'Avancé', hotkey: 'Raccourci de calibrage en jeu',
    gameAspectRatio: 'Format de l’image du jeu', gameAspectRatioDescription: 'Le format défini dans le jeu guide la recherche dans la capture.',
    hotkeyDescription: 'Sous Windows, appuyez sur Ctrl+Maj+F8 sur l’écran de préparation ou lorsque le coffre sécurisé est visible. Vérifiez la capture sur la page d’état.',
  },
  de: {
    observation: 'Beobachtung und Kalibrierung', combat: 'Kampferkennung', loot: 'Erkennung roter Gegenstände', speech: 'Reaktionen auf Ereignisse', advanced: 'Erweitert', hotkey: 'Kalibriertastenkürzel im Spiel',
    gameAspectRatio: 'Seitenverhältnis im Spiel', gameAspectRatioDescription: 'Das Seitenverhältnis des Spiels hilft beim Auffinden von Elementen im Bild.',
    hotkeyDescription: 'Drücke unter Windows in der Einsatzvorbereitung oder bei sichtbarem Sicherheitscontainer Strg+Umschalt+F8. Prüfe die Aufnahme auf der Statusseite.',
  },
  'es-419': {
    observation: 'Observación y calibración', combat: 'Reconocimiento de combate', loot: 'Reconocimiento de objetos rojos', speech: 'Respuestas a eventos', advanced: 'Avanzado', hotkey: 'Atajo de calibración en el juego',
    gameAspectRatio: 'Relación de aspecto del juego', gameAspectRatioDescription: 'Elige la proporción del área de visualización del juego para orientar la búsqueda en la captura.',
    hotkeyDescription: 'En Windows, presiona Ctrl+Mayús+F8 en la preparación o con la caja fuerte visible. Revisa la captura en la página de estado.',
  },
  'pt-BR': {
    observation: 'Observação e calibração', combat: 'Reconhecimento de combate', loot: 'Reconhecimento de itens vermelhos', speech: 'Respostas a eventos', advanced: 'Avançado', hotkey: 'Atalho de calibração no jogo',
    gameAspectRatio: 'Proporção da tela do jogo', gameAspectRatioDescription: 'A proporção da área de exibição do jogo orienta a busca na captura.',
    hotkeyDescription: 'No Windows, pressione Ctrl+Shift+F8 na preparação ou com o cofre visível. Confira a captura na página de status.',
  },
  it: {
    observation: 'Osservazione e calibrazione', combat: 'Riconoscimento dei combattimenti', loot: 'Riconoscimento degli oggetti rossi', speech: 'Risposte agli eventi', advanced: 'Avanzate', hotkey: 'Scorciatoia di calibrazione nel gioco',
    gameAspectRatio: 'Proporzioni dello schermo di gioco', gameAspectRatioDescription: 'Le proporzioni impostate nel gioco guidano la ricerca nella schermata.',
    hotkeyDescription: 'In Windows premi Ctrl+Maiusc+F8 nella schermata di preparazione o quando è visibile la cassaforte. Controlla la cattura nella pagina di stato.',
  },
  ru: {
    observation: 'Наблюдение и калибровка', combat: 'Распознавание боя', loot: 'Распознавание красных предметов', speech: 'Реакции на события', advanced: 'Дополнительно', hotkey: 'Клавиши калибровки в игре',
    gameAspectRatio: 'Соотношение сторон игры', gameAspectRatioDescription: 'Выберите пропорции области отображения в игре для поиска элементов на снимке.',
    hotkeyDescription: 'В Windows нажмите Ctrl+Shift+F8 на экране подготовки или при открытом сейфе. Проверьте снимок на странице состояния.',
  },
};

export function configGroupText(language: Language): typeof en { return TEXT[language]; }
