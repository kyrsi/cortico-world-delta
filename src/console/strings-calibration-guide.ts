import type { Language } from 'cortico/core/language.ts';

type Guide = { summary: string; schematic: string; preparation: string; hint: string; regions: string; regionsHint: string };
const TEXT: Record<Language, Guide> = {
  zh: {
    summary: '查看校准示意', schematic: '以下为布局示意，非游戏截图。', preparation: '出发准备页',
    hint: '保持左上角“开始游戏”页签和右下角出发准备按钮可见，暂不进入匹配。',
    regions: '观察区域参考', regionsHint: '虚线框表示参考位置。实际识别范围以校准后的截图和框选区域为准。',
  },
  'zh-Hant': {
    summary: '查看校準示意', schematic: '以下為版面示意，非遊戲截圖。', preparation: '出發準備頁',
    hint: '保持左上角「開始遊戲」分頁和右下角出發準備按鈕可見，暫不進入配對。',
    regions: '觀察區域參考', regionsHint: '虛線框表示參考位置。實際辨識範圍以校準後的截圖和框選區域為準。',
  },
  en: {
    summary: 'View calibration diagrams', schematic: 'Layout diagrams, not game screenshots.', preparation: 'Deployment screen',
    hint: 'Keep the Start tab at the top left and deployment controls at the bottom right visible. Stay out of matchmaking.',
    regions: 'Reference observation areas', regionsHint: 'Dashed boxes show reference positions. Check the resulting screenshot and highlighted areas after calibration.',
  },
  ja: {
    summary: '調整の模式図を表示', schematic: '配置を示す模式図です。ゲームのスクリーンショットではありません。', preparation: '出撃準備画面',
    hint: '左上のゲーム開始タブと右下の出撃ボタンが見える状態にし、マッチングは開始しないでください。',
    regions: '観察範囲の目安', regionsHint: '点線は位置の目安です。調整後の画像と枠で実際の認識範囲を確認してください。',
  },
  ko: {
    summary: '보정 배치도 보기', schematic: '게임 스크린샷이 아닌 배치도입니다.', preparation: '출발 준비 화면',
    hint: '왼쪽 위 게임 시작 탭과 오른쪽 아래 출발 버튼이 보이도록 유지하고 매칭을 시작하지 마세요.',
    regions: '관찰 영역 참고', regionsHint: '점선은 참고 위치입니다. 보정 후 캡처와 표시된 영역에서 실제 인식 범위를 확인하세요.',
  },
  fr: {
    summary: 'Voir les schémas de calibrage', schematic: 'Schémas de disposition, pas des captures du jeu.', preparation: 'Écran de préparation',
    hint: 'Gardez visibles l’onglet de lancement en haut à gauche et les commandes de déploiement en bas à droite. Ne lancez pas la recherche de partie.',
    regions: 'Zones d’observation de référence', regionsHint: 'Les pointillés indiquent des positions de référence. Vérifiez la capture et les zones encadrées après le calibrage.',
  },
  de: {
    summary: 'Kalibrierungsschemata anzeigen', schematic: 'Schematische Anordnung, keine Spielaufnahmen.', preparation: 'Einsatzvorbereitung',
    hint: 'Halten Sie den Start-Reiter oben links und die Einsatzschaltflächen unten rechts sichtbar. Starten Sie noch keine Spielsuche.',
    regions: 'Referenzbereiche der Beobachtung', regionsHint: 'Gestrichelte Rahmen zeigen Referenzpositionen. Prüfen Sie nach der Kalibrierung das Bild und die markierten Bereiche.',
  },
  'es-419': {
    summary: 'Ver diagramas de calibración', schematic: 'Diagramas de distribución, no capturas del juego.', preparation: 'Pantalla de preparación',
    hint: 'Mantén visibles la pestaña de inicio arriba a la izquierda y los controles de despliegue abajo a la derecha. No inicies la búsqueda de partida.',
    regions: 'Áreas de observación de referencia', regionsHint: 'Los recuadros punteados muestran posiciones de referencia. Revisa la captura y las áreas marcadas después de calibrar.',
  },
  'pt-BR': {
    summary: 'Ver diagramas de calibração', schematic: 'Diagramas de disposição, não capturas do jogo.', preparation: 'Tela de preparação',
    hint: 'Mantenha visíveis a aba de início no canto superior esquerdo e os controles de partida no canto inferior direito. Não inicie a busca de partida.',
    regions: 'Áreas de observação de referência', regionsHint: 'Os quadros tracejados mostram posições de referência. Confira a captura e as áreas marcadas após calibrar.',
  },
  it: {
    summary: 'Mostra gli schemi di calibrazione', schematic: 'Schemi della disposizione, non schermate del gioco.', preparation: 'Schermata di preparazione',
    hint: 'Mantieni visibili la scheda di avvio in alto a sinistra e i comandi di partenza in basso a destra. Non avviare la ricerca della partita.',
    regions: 'Aree di osservazione di riferimento', regionsHint: 'I riquadri tratteggiati indicano posizioni di riferimento. Controlla la cattura e le aree evidenziate dopo la calibrazione.',
  },
  ru: {
    summary: 'Показать схемы калибровки', schematic: 'Схемы расположения элементов, а не снимки игры.', preparation: 'Экран подготовки',
    hint: 'Оставьте видимыми вкладку запуска слева вверху и кнопки подготовки справа внизу. Не запускайте поиск матча.',
    regions: 'Ориентиры областей наблюдения', regionsHint: 'Пунктирные рамки обозначают примерные позиции. После калибровки проверьте снимок и выделенные области.',
  },
};

export function calibrationGuideText(language: Language): Guide { return TEXT[language]; }
