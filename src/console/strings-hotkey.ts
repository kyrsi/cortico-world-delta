import type { Language } from 'cortico/core/language.ts';

const en = {
  registered: 'Works in game', registering: 'Enabling in-game shortcut…', occupied: 'Shortcut already in use',
  disabled: 'Shortcut off', blocked: 'Waiting for viewing and observation permissions', unavailable: 'In-game shortcut unavailable',
  prepare: 'Use the shortcut on the deployment screen. If you click the button instead, return to the game within 3 seconds. Successful calibration is saved automatically; the screenshot and highlighted areas remain available to view.',
};

const TEXT: Record<Language, typeof en> = {
  en,
  zh: {
    registered: '游戏前台可用', registering: '正在启用游戏内快捷键…', occupied: '快捷键已被占用',
    disabled: '快捷键已关闭', blocked: '等待查看和游戏观察权限', unavailable: '游戏内快捷键不可用',
    prepare: '在出发准备页按快捷键；如点击“一键校准”按钮，请在 3 秒内切回游戏。识别成功后自动保存，可查看截图和框选区域。',
  },
  'zh-Hant': {
    registered: '可在遊戲前景使用', registering: '正在啟用遊戲內快捷鍵…', occupied: '快捷鍵已被占用',
    disabled: '快捷鍵已關閉', blocked: '等待檢視和遊戲觀察權限', unavailable: '遊戲內快捷鍵無法使用',
    prepare: '在出發準備頁按快捷鍵；若點選「一鍵校準」按鈕，請在 3 秒內切回遊戲。辨識成功後自動儲存，可查看截圖和框選區域。',
  },
  ja: {
    registered: 'ゲーム内で使用可能', registering: 'ゲーム内のショートカットを有効にしています…', occupied: 'ショートカットは使用中です',
    disabled: 'ショートカットはオフ', blocked: '表示と観察の権限が必要です', unavailable: 'ゲーム内でショートカットを使用できません',
    prepare: '出撃準備画面でショートカットを押してください。ボタンを押す場合は3秒以内にゲームへ戻ってください。検出に成功すると自動保存され、画像と枠を確認できます。',
  },
  ko: {
    registered: '게임에서 사용 가능', registering: '게임 내 단축키 활성화 중…', occupied: '단축키가 이미 사용 중입니다',
    disabled: '단축키 꺼짐', blocked: '화면 보기 및 관찰 권한 필요', unavailable: '게임 내 단축키를 사용할 수 없습니다',
    prepare: '출발 준비 화면에서 단축키를 누르세요. 버튼을 누른 경우에는 3초 안에 게임으로 돌아가세요. 인식에 성공하면 자동 저장되며 캡처와 표시된 영역을 볼 수 있습니다.',
  },
  fr: {
    registered: 'Disponible en jeu', registering: 'Activation du raccourci en jeu…', occupied: 'Raccourci déjà utilisé',
    disabled: 'Raccourci désactivé', blocked: 'Autorisations d’affichage et d’observation requises', unavailable: 'Raccourci indisponible en jeu',
    prepare: 'Utilisez le raccourci sur l’écran de préparation. Si vous cliquez sur le bouton, revenez au jeu sous 3 secondes. Le calibrage réussi est enregistré automatiquement ; la capture et les zones encadrées restent consultables.',
  },
  de: {
    registered: 'Im Spiel verfügbar', registering: 'Tastenkürzel im Spiel wird aktiviert…', occupied: 'Tastenkürzel bereits belegt',
    disabled: 'Tastenkürzel ausgeschaltet', blocked: 'Bildschirmfreigabe und Beobachtungserlaubnis erforderlich', unavailable: 'Tastenkürzel im Spiel nicht verfügbar',
    prepare: 'Drücken Sie das Kürzel in der Einsatzvorbereitung. Wenn Sie die Schaltfläche verwenden, kehren Sie innerhalb von 3 Sekunden ins Spiel zurück. Bei erfolgreicher Erkennung wird automatisch gespeichert; das Bild und die markierten Bereiche bleiben sichtbar.',
  },
  'es-419': {
    registered: 'Disponible en el juego', registering: 'Activando el atajo en el juego…', occupied: 'Atajo en uso',
    disabled: 'Atajo desactivado', blocked: 'Se requieren permisos de visualización y observación', unavailable: 'Atajo no disponible en el juego',
    prepare: 'Usa el atajo en la pantalla de preparación. Si haces clic en el botón, vuelve al juego en menos de 3 segundos. La calibración correcta se guarda automáticamente; la captura y las áreas marcadas quedan disponibles para ver.',
  },
  'pt-BR': {
    registered: 'Disponível no jogo', registering: 'Ativando o atalho no jogo…', occupied: 'Atalho em uso',
    disabled: 'Atalho desativado', blocked: 'Permissões de visualização e observação necessárias', unavailable: 'Atalho indisponível no jogo',
    prepare: 'Use o atalho na tela de preparação. Se clicar no botão, volte ao jogo em até 3 segundos. A calibração bem-sucedida é salva automaticamente; a captura e as áreas marcadas continuam disponíveis para consulta.',
  },
  it: {
    registered: 'Disponibile nel gioco', registering: 'Attivazione della scorciatoia nel gioco…', occupied: 'Scorciatoia già in uso',
    disabled: 'Scorciatoia disattivata', blocked: 'Autorizzazioni di visualizzazione e osservazione necessarie', unavailable: 'Scorciatoia non disponibile nel gioco',
    prepare: 'Usa la scorciatoia nella schermata di preparazione. Se premi il pulsante, torna al gioco entro 3 secondi. La calibrazione riuscita viene salvata automaticamente; la cattura e le aree evidenziate restano consultabili.',
  },
  ru: {
    registered: 'Доступно в игре', registering: 'Включение клавиш в игре…', occupied: 'Сочетание клавиш уже используется',
    disabled: 'Сочетание клавиш выключено', blocked: 'Нужны разрешения на просмотр и наблюдение', unavailable: 'Сочетание клавиш недоступно в игре',
    prepare: 'Нажмите сочетание клавиш на экране подготовки. Если используете кнопку, вернитесь в игру в течение 3 секунд. При успешном распознавании калибровка сохраняется автоматически; снимок и выделенные области остаются доступными для просмотра.',
  },
};

export function calibrationHotkeyText(language: Language): typeof en { return TEXT[language]; }
