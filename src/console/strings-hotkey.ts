import type { Language } from 'cortico/core/language.ts';

const en = {
  registered: 'Works in game', registering: 'Enabling in-game shortcut…', occupied: 'Shortcut already in use',
  disabled: 'Shortcut off', blocked: 'Waiting for viewing and observation permissions', unavailable: 'In-game shortcut unavailable',
  prepare: 'Press the shortcut on the deployment screen or with the full safe box visible. The button allows 3 seconds to switch back.',
};

const TEXT: Record<Language, typeof en> = {
  en,
  zh: {
    registered: '游戏前台可用', registering: '正在启用游戏内快捷键…', occupied: '快捷键已被占用',
    disabled: '快捷键已关闭', blocked: '等待查看和游戏观察权限', unavailable: '游戏内快捷键不可用',
    prepare: '在出发准备页或完整的安全箱画面按快捷键。点击按钮后有 3 秒切回游戏。',
  },
  'zh-Hant': {
    registered: '可在遊戲前景使用', registering: '正在啟用遊戲內快捷鍵…', occupied: '快捷鍵已被占用',
    disabled: '快捷鍵已關閉', blocked: '等待檢視和遊戲觀察權限', unavailable: '遊戲內快捷鍵無法使用',
    prepare: '在出發準備頁或完整的保險箱畫面按快捷鍵。點選按鈕後有 3 秒切回遊戲。',
  },
  ja: {
    registered: 'ゲーム内で使用可能', registering: 'ゲーム内のショートカットを有効にしています…', occupied: 'ショートカットは使用中です',
    disabled: 'ショートカットはオフ', blocked: '表示と観察の権限が必要です', unavailable: 'ゲーム内でショートカットを使用できません',
    prepare: '出撃準備画面かセーフボックス全体の表示中にショートカットを押してください。ボタンを押した場合は3秒以内にゲームに戻ってください。',
  },
  ko: {
    registered: '게임에서 사용 가능', registering: '게임 내 단축키 활성화 중…', occupied: '단축키가 이미 사용 중입니다',
    disabled: '단축키 꺼짐', blocked: '화면 보기 및 관찰 권한 필요', unavailable: '게임 내 단축키를 사용할 수 없습니다',
    prepare: '출발 준비 화면이나 보안 상자 전체가 보일 때 단축키를 누르세요. 버튼을 누르면 3초 안에 게임으로 돌아가세요.',
  },
  fr: {
    registered: 'Disponible en jeu', registering: 'Activation du raccourci en jeu…', occupied: 'Raccourci déjà utilisé',
    disabled: 'Raccourci désactivé', blocked: 'Autorisations d’affichage et d’observation requises', unavailable: 'Raccourci indisponible en jeu',
    prepare: 'Utilisez le raccourci sur l’écran de préparation ou lorsque le coffre est entièrement visible. Le bouton vous laisse 3 secondes pour revenir au jeu.',
  },
  de: {
    registered: 'Im Spiel verfügbar', registering: 'Tastenkürzel im Spiel wird aktiviert…', occupied: 'Tastenkürzel bereits belegt',
    disabled: 'Tastenkürzel ausgeschaltet', blocked: 'Bildschirmfreigabe und Beobachtungserlaubnis erforderlich', unavailable: 'Tastenkürzel im Spiel nicht verfügbar',
    prepare: 'Drücken Sie das Kürzel in der Einsatzvorbereitung oder bei vollständig sichtbarem Sicherheitscontainer. Nach einem Klick bleiben 3 Sekunden zur Rückkehr ins Spiel.',
  },
  'es-419': {
    registered: 'Disponible en el juego', registering: 'Activando el atajo en el juego…', occupied: 'Atajo en uso',
    disabled: 'Atajo desactivado', blocked: 'Se requieren permisos de visualización y observación', unavailable: 'Atajo no disponible en el juego',
    prepare: 'Usa el atajo en la preparación o con toda la caja fuerte visible. El botón te da 3 segundos para volver al juego.',
  },
  'pt-BR': {
    registered: 'Disponível no jogo', registering: 'Ativando o atalho no jogo…', occupied: 'Atalho em uso',
    disabled: 'Atalho desativado', blocked: 'Permissões de visualização e observação necessárias', unavailable: 'Atalho indisponível no jogo',
    prepare: 'Use o atalho na preparação ou com o cofre inteiro visível. O botão dá 3 segundos para voltar ao jogo.',
  },
  it: {
    registered: 'Disponibile nel gioco', registering: 'Attivazione della scorciatoia nel gioco…', occupied: 'Scorciatoia già in uso',
    disabled: 'Scorciatoia disattivata', blocked: 'Autorizzazioni di visualizzazione e osservazione necessarie', unavailable: 'Scorciatoia non disponibile nel gioco',
    prepare: 'Usa la scorciatoia nella preparazione o con l’intera cassaforte visibile. Il pulsante lascia 3 secondi per tornare al gioco.',
  },
  ru: {
    registered: 'Доступно в игре', registering: 'Включение клавиш в игре…', occupied: 'Сочетание клавиш уже используется',
    disabled: 'Сочетание клавиш выключено', blocked: 'Нужны разрешения на просмотр и наблюдение', unavailable: 'Сочетание клавиш недоступно в игре',
    prepare: 'Нажмите сочетание клавиш на экране подготовки или когда виден весь сейф. После нажатия кнопки есть 3 секунды, чтобы вернуться в игру.',
  },
};

export function calibrationHotkeyText(language: Language): typeof en { return TEXT[language]; }
