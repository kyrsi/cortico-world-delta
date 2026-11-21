import type { Language } from 'cortico/core/language.ts';

const en = {
  readiness: 'Recognition readiness', settings: 'Observation settings', calibration: 'Manual area calibration',
  combat: 'Combat recognition', loot: 'Red-tier item recognition', incomplete: 'Setup required',
  configureCombat: 'Configure combat', configureLoot: 'Configure red-tier items',
  sourcePending: 'Display selected, awaiting capture', lootLanguage: 'Choose the item interface language.',
  combatHint: 'Enter the full nickname as it appears in the game. Recognition looks for kills and knockdowns in the calibrated areas.',
  lootHint: 'Recognition checks the item grid and headings in looting, container and inventory screens. Sensitivity changes which candidates are reported.',
};

const TEXT: Record<Language, typeof en> = {
  en,
  zh: {
    readiness: '识别准备', settings: '观察配置', calibration: '手动校准区域',
    combat: '战斗识别', loot: '出红识别', incomplete: '待补充配置',
    configureCombat: '配置战斗识别', configureLoot: '配置出红识别',
    sourcePending: '已选择屏幕，等待采集', lootLanguage: '请选择物品界面语言。',
    combatHint: '填写游戏内显示的完整昵称。战斗识别在校准区域内寻找击杀和击倒提示。',
    lootHint: '出红识别检查搜刮、容器和背包界面的物品网格与标题。灵敏度决定哪些候选会报告。',
  },
  'zh-Hant': {
    readiness: '辨識準備', settings: '觀察配置', calibration: '手動校準區域',
    combat: '戰鬥辨識', loot: '紅色品質物品辨識', incomplete: '待補充配置',
    configureCombat: '配置戰鬥辨識', configureLoot: '配置物品辨識',
    sourcePending: '已選擇螢幕，等待擷取', lootLanguage: '請選擇物品介面語言。',
    combatHint: '填寫遊戲內顯示的完整暱稱。戰鬥辨識在校準區域內尋找擊殺和擊倒提示。',
    lootHint: '物品辨識會檢查搜刮、容器和背包介面的物品格與標題。靈敏度決定回報哪些候選物品。',
  },
  ja: {
    readiness: '認識の準備状況', settings: '観察設定', calibration: '範囲の手動調整',
    combat: '戦闘の認識', loot: '赤品質アイテムの認識', incomplete: '設定が必要',
    configureCombat: '戦闘の認識を設定', configureLoot: '赤品質アイテムの認識を設定',
    sourcePending: '画面を選択済み。キャプチャ待ち', lootLanguage: 'アイテム画面の言語を選択してください。',
    combatHint: 'ゲームに表示される名前を省略せずに入力してください。調整した範囲内のキルとダウンの通知を認識します。',
    lootHint: '漁り、コンテナ、インベントリの画面でアイテム欄と見出しを確認します。感度によって報告する候補が変わります。',
  },
  ko: {
    readiness: '인식 준비 상태', settings: '관찰 설정', calibration: '영역 수동 보정',
    combat: '전투 인식', loot: '빨간 등급 아이템 인식', incomplete: '설정 필요',
    configureCombat: '전투 인식 설정', configureLoot: '빨간 등급 아이템 설정',
    sourcePending: '화면 선택 완료, 캡처 대기 중', lootLanguage: '아이템 화면 언어를 선택하세요.',
    combatHint: '게임에 표시되는 닉네임을 그대로 입력하세요. 보정된 영역에서 처치 및 다운 알림을 찾습니다.',
    lootHint: '전리품, 컨테이너, 인벤토리 화면의 아이템 칸과 제목을 확인합니다. 민감도에 따라 보고되는 후보가 달라집니다.',
  },
  fr: {
    readiness: 'État de préparation', settings: 'Réglages de l’observation', calibration: 'Calibrage manuel des zones',
    combat: 'Reconnaissance des combats', loot: 'Reconnaissance des objets de qualité rouge', incomplete: 'Configuration requise',
    configureCombat: 'Configurer les combats', configureLoot: 'Configurer les objets rouges',
    sourcePending: 'Écran sélectionné, en attente de capture', lootLanguage: 'Choisissez la langue de l’interface des objets.',
    combatHint: 'Saisissez le pseudo complet tel qu’il apparaît dans le jeu. Les zones calibrées servent à repérer les éliminations et les mises à terre.',
    lootHint: 'La reconnaissance vérifie la grille et les titres des écrans de butin, de conteneur et d’inventaire. La sensibilité détermine les objets signalés.',
  },
  de: {
    readiness: 'Bereitschaft der Erkennung', settings: 'Beobachtungseinstellungen', calibration: 'Bereiche manuell kalibrieren',
    combat: 'Kampferkennung', loot: 'Erkennung von Gegenständen roter Qualität', incomplete: 'Einrichtung erforderlich',
    configureCombat: 'Kampferkennung einrichten', configureLoot: 'Rote Gegenstände einrichten',
    sourcePending: 'Bildschirm ausgewählt, Aufnahme steht aus', lootLanguage: 'Wählen Sie die Sprache der Gegenstandsansicht.',
    combatHint: 'Geben Sie den vollständigen Namen ein, wie er im Spiel angezeigt wird. Die Erkennung sucht in den kalibrierten Bereichen nach Eliminierungen und Niederschlägen.',
    lootHint: 'Die Erkennung prüft das Gegenstandsraster und die Überschriften in Beute-, Behälter- und Inventaransichten. Die Empfindlichkeit bestimmt, welche Funde gemeldet werden.',
  },
  'es-419': {
    readiness: 'Preparación del reconocimiento', settings: 'Configuración de la observación', calibration: 'Calibración manual de áreas',
    combat: 'Reconocimiento de combate', loot: 'Reconocimiento de objetos de calidad roja', incomplete: 'Falta configurar',
    configureCombat: 'Configurar combate', configureLoot: 'Configurar objetos rojos',
    sourcePending: 'Pantalla seleccionada, esperando la captura', lootLanguage: 'Elige el idioma de la interfaz de objetos.',
    combatHint: 'Ingresa tu apodo completo tal como aparece en el juego. El reconocimiento busca eliminaciones y derribos en las áreas calibradas.',
    lootHint: 'El reconocimiento revisa la cuadrícula y los títulos de las pantallas de botín, contenedor e inventario. La sensibilidad determina qué candidatos se informan.',
  },
  'pt-BR': {
    readiness: 'Preparação do reconhecimento', settings: 'Configurações da observação', calibration: 'Calibração manual das áreas',
    combat: 'Reconhecimento de combate', loot: 'Reconhecimento de itens de qualidade vermelha', incomplete: 'Configuração necessária',
    configureCombat: 'Configurar combate', configureLoot: 'Configurar itens vermelhos',
    sourcePending: 'Tela selecionada, aguardando captura', lootLanguage: 'Escolha o idioma da interface de itens.',
    combatHint: 'Informe o nome completo como aparece no jogo. O reconhecimento procura eliminações e derrubadas nas áreas calibradas.',
    lootHint: 'O reconhecimento verifica a grade e os títulos nas telas de saque, contêiner e inventário. A sensibilidade define quais candidatos são relatados.',
  },
  it: {
    readiness: 'Stato di preparazione', settings: 'Impostazioni dell’osservazione', calibration: 'Calibrazione manuale delle aree',
    combat: 'Riconoscimento del combattimento', loot: 'Riconoscimento degli oggetti di qualità rossa', incomplete: 'Configurazione necessaria',
    configureCombat: 'Configura il combattimento', configureLoot: 'Configura gli oggetti rossi',
    sourcePending: 'Schermo selezionato, in attesa di acquisizione', lootLanguage: 'Scegli la lingua dell’interfaccia oggetti.',
    combatHint: 'Inserisci il nome completo come appare nel gioco. Il riconoscimento cerca eliminazioni e atterramenti nelle aree calibrate.',
    lootHint: 'Il riconoscimento verifica la griglia e i titoli nelle schermate di bottino, contenitori e inventario. La sensibilità determina quali candidati vengono segnalati.',
  },
  ru: {
    readiness: 'Готовность распознавания', settings: 'Настройки наблюдения', calibration: 'Ручная калибровка областей',
    combat: 'Распознавание боя', loot: 'Распознавание предметов красного качества', incomplete: 'Требуется настройка',
    configureCombat: 'Настроить распознавание боя', configureLoot: 'Настроить распознавание красных предметов',
    sourcePending: 'Экран выбран, ожидается захват', lootLanguage: 'Выберите язык интерфейса предметов.',
    combatHint: 'Введите полное имя в том виде, в каком оно отображается в игре. Программа ищет сообщения об убийствах и нокдаунах в откалиброванных областях.',
    lootHint: 'Программа проверяет сетку и заголовки на экранах добычи, контейнеров и инвентаря. Чувствительность определяет, какие находки будут отмечены.',
  },
};

export function dashboardText(language: Language): typeof en { return TEXT[language]; }
