import type { Language } from 'cortico/core/language.ts';

const zh = {
  title: '启动检查', pending: '开始观察后检查当前屏幕和已保存区域。', checked: '已读取当前屏幕。',
  resolution: '分辨率', aspectRatio: '宽高比', scale: '缩放', unknown: '未知',
  combat: '战斗区域', loot: '物品区域', calibrateCombat: '校准战斗区域', calibrateLoot: '校准物品区域',
  hint: '仍需在实际游戏画面中预览核对区域；识别效果需单独验证。',
  statuses: { disabled: '识别已关闭', pending: '等待当前屏幕', missing: '尚未校准', compatible: '校准与当前屏幕一致', invalid: '校准需更新' },
  reasons: {
    'calibration-required': '请加载预览并保存区域。', 'display-changed': '观察屏幕已更换，请重新校准。',
    'resolution-changed': '分辨率已变化，请重新校准。', 'aspect-changed': '宽高比已变化，请重新校准。',
    'scale-changed': '屏幕缩放已变化，请重新校准。', 'geometry-changed': '屏幕位置、方向或标识已变化，请重新校准。',
    'topology-changed': '显示器配置已变化，请重新校准。', 'roi-too-large': '已保存区域超过像素或面积限制，请缩小选区。',
  },
};
type StartupText = typeof zh;
const en: StartupText = {
  title: 'Startup check', pending: 'Start observation to check the current display and saved areas.', checked: 'Current display read.',
  resolution: 'Resolution', aspectRatio: 'Aspect ratio', scale: 'Scaling', unknown: 'Unknown',
  combat: 'Combat areas', loot: 'Item areas', calibrateCombat: 'Calibrate combat areas', calibrateLoot: 'Calibrate item areas',
  hint: 'Preview the areas in the actual game screen. Recognition accuracy needs separate validation.',
  statuses: { disabled: 'Recognition is off', pending: 'Waiting for the current display', missing: 'Calibration needed', compatible: 'Calibration matches the current display', invalid: 'Calibration needs updating' },
  reasons: {
    'calibration-required': 'Load a preview and save the areas.', 'display-changed': 'The observation display changed. Calibrate again.',
    'resolution-changed': 'The resolution changed. Calibrate again.', 'aspect-changed': 'The aspect ratio changed. Calibrate again.',
    'scale-changed': 'Display scaling changed. Calibrate again.', 'geometry-changed': 'The display position, orientation or identity changed. Calibrate again.',
    'topology-changed': 'The monitor configuration changed. Calibrate again.', 'roi-too-large': 'Saved areas exceed the pixel or area limits. Reduce the selection.',
  },
};
const zhHant: StartupText = {
  title: '啟動檢查', pending: '開始觀察後檢查目前螢幕和已儲存區域。', checked: '已讀取目前螢幕。',
  resolution: '解析度', aspectRatio: '長寬比', scale: '縮放', unknown: '未知',
  combat: '戰鬥區域', loot: '物品區域', calibrateCombat: '校準戰鬥區域', calibrateLoot: '校準物品區域',
  hint: '仍須在實際遊戲畫面中預覽核對區域；辨識效果須另外驗證。',
  statuses: { disabled: '辨識已關閉', pending: '等待目前螢幕', missing: '尚未校準', compatible: '校準與目前螢幕一致', invalid: '校準須更新' },
  reasons: {
    'calibration-required': '請載入預覽並儲存區域。', 'display-changed': '觀察螢幕已更換，請重新校準。',
    'resolution-changed': '解析度已變更，請重新校準。', 'aspect-changed': '長寬比已變更，請重新校準。',
    'scale-changed': '螢幕縮放已變更，請重新校準。', 'geometry-changed': '螢幕位置、方向或識別資訊已變更，請重新校準。',
    'topology-changed': '顯示器配置已變更，請重新校準。', 'roi-too-large': '已儲存區域超過像素或面積限制，請縮小選區。',
  },
};
const ja: StartupText = {
  title: '開始時の確認', pending: '観察を開始すると、現在の画面と保存済み範囲を確認します。', checked: '現在の画面を読み取りました。',
  resolution: '解像度', aspectRatio: '縦横比', scale: '拡大率', unknown: '不明',
  combat: '戦闘の範囲', loot: 'アイテムの範囲', calibrateCombat: '戦闘の範囲を調整', calibrateLoot: 'アイテムの範囲を調整',
  hint: '実際のゲーム画面で範囲をプレビューして確認してください。認識精度は別途検証が必要です。',
  statuses: { disabled: '認識はオフ', pending: '現在の画面を待機中', missing: '範囲の調整が必要', compatible: '調整内容は現在の画面と一致', invalid: '範囲の再調整が必要' },
  reasons: {
    'calibration-required': 'プレビューを読み込み、範囲を保存してください。', 'display-changed': '観察画面が変わりました。再調整してください。',
    'resolution-changed': '解像度が変わりました。再調整してください。', 'aspect-changed': '縦横比が変わりました。再調整してください。',
    'scale-changed': '画面の拡大率が変わりました。再調整してください。', 'geometry-changed': '画面の位置、向き、または識別情報が変わりました。再調整してください。',
    'topology-changed': 'モニター構成が変わりました。再調整してください。', 'roi-too-large': '保存済み範囲が画素数または面積の上限を超えています。選択範囲を縮小してください。',
  },
};
const ko: StartupText = {
  title: '시작 확인', pending: '관찰을 시작하면 현재 화면과 저장된 영역을 확인합니다.', checked: '현재 화면을 읽었습니다.',
  resolution: '해상도', aspectRatio: '화면 비율', scale: '배율', unknown: '알 수 없음',
  combat: '전투 영역', loot: '아이템 영역', calibrateCombat: '전투 영역 보정', calibrateLoot: '아이템 영역 보정',
  hint: '실제 게임 화면의 미리보기에서 영역을 확인하세요. 인식 정확도는 별도로 검증해야 합니다.',
  statuses: { disabled: '인식 꺼짐', pending: '현재 화면 대기 중', missing: '보정 필요', compatible: '보정이 현재 화면과 일치함', invalid: '보정 업데이트 필요' },
  reasons: {
    'calibration-required': '미리보기를 불러와 영역을 저장하세요.', 'display-changed': '관찰 화면이 변경되었습니다. 다시 보정하세요.',
    'resolution-changed': '해상도가 변경되었습니다. 다시 보정하세요.', 'aspect-changed': '화면 비율이 변경되었습니다. 다시 보정하세요.',
    'scale-changed': '화면 배율이 변경되었습니다. 다시 보정하세요.', 'geometry-changed': '화면 위치, 방향 또는 식별 정보가 변경되었습니다. 다시 보정하세요.',
    'topology-changed': '모니터 구성이 변경되었습니다. 다시 보정하세요.', 'roi-too-large': '저장된 영역이 픽셀 또는 면적 한도를 초과합니다. 선택 영역을 줄이세요.',
  },
};
const fr: StartupText = {
  title: 'Vérification au démarrage', pending: 'Démarrez l’observation pour vérifier l’écran actuel et les zones enregistrées.', checked: 'Écran actuel lu.',
  resolution: 'Résolution', aspectRatio: 'Format', scale: 'Mise à l’échelle', unknown: 'Inconnue',
  combat: 'Zones de combat', loot: 'Zones des objets', calibrateCombat: 'Calibrer les zones de combat', calibrateLoot: 'Calibrer les zones des objets',
  hint: 'Vérifiez les zones dans l’aperçu du jeu réel. La précision de reconnaissance exige une validation distincte.',
  statuses: { disabled: 'Reconnaissance désactivée', pending: 'En attente de l’écran actuel', missing: 'Calibrage nécessaire', compatible: 'Calibrage conforme à l’écran actuel', invalid: 'Calibrage à mettre à jour' },
  reasons: {
    'calibration-required': 'Chargez un aperçu et enregistrez les zones.', 'display-changed': 'L’écran observé a changé. Recalibrez les zones.',
    'resolution-changed': 'La résolution a changé. Recalibrez les zones.', 'aspect-changed': 'Le format de l’écran a changé. Recalibrez les zones.',
    'scale-changed': 'La mise à l’échelle a changé. Recalibrez les zones.', 'geometry-changed': 'La position, l’orientation ou l’identité de l’écran a changé. Recalibrez les zones.',
    'topology-changed': 'La configuration des moniteurs a changé. Recalibrez les zones.', 'roi-too-large': 'Les zones enregistrées dépassent les limites de pixels ou de surface. Réduisez la sélection.',
  },
};
const de: StartupText = {
  title: 'Startprüfung', pending: 'Starten Sie die Beobachtung, um den aktuellen Bildschirm und gespeicherte Bereiche zu prüfen.', checked: 'Aktueller Bildschirm erfasst.',
  resolution: 'Auflösung', aspectRatio: 'Seitenverhältnis', scale: 'Skalierung', unknown: 'Unbekannt',
  combat: 'Kampfbereiche', loot: 'Gegenstandsbereiche', calibrateCombat: 'Kampfbereiche kalibrieren', calibrateLoot: 'Gegenstandsbereiche kalibrieren',
  hint: 'Prüfen Sie die Bereiche in der Vorschau des tatsächlichen Spiels. Die Erkennungsgenauigkeit muss gesondert geprüft werden.',
  statuses: { disabled: 'Erkennung ausgeschaltet', pending: 'Warten auf den aktuellen Bildschirm', missing: 'Kalibrierung erforderlich', compatible: 'Kalibrierung entspricht dem aktuellen Bildschirm', invalid: 'Kalibrierung muss aktualisiert werden' },
  reasons: {
    'calibration-required': 'Laden Sie eine Vorschau und speichern Sie die Bereiche.', 'display-changed': 'Der beobachtete Bildschirm hat sich geändert. Kalibrieren Sie erneut.',
    'resolution-changed': 'Die Auflösung hat sich geändert. Kalibrieren Sie erneut.', 'aspect-changed': 'Das Seitenverhältnis hat sich geändert. Kalibrieren Sie erneut.',
    'scale-changed': 'Die Skalierung hat sich geändert. Kalibrieren Sie erneut.', 'geometry-changed': 'Position, Ausrichtung oder Identität des Bildschirms haben sich geändert. Kalibrieren Sie erneut.',
    'topology-changed': 'Die Monitorkonfiguration hat sich geändert. Kalibrieren Sie erneut.', 'roi-too-large': 'Gespeicherte Bereiche überschreiten die Pixel- oder Flächenlimits. Verkleinern Sie die Auswahl.',
  },
};
const es: StartupText = {
  title: 'Comprobación al iniciar', pending: 'Inicia la observación para comprobar la pantalla actual y las áreas guardadas.', checked: 'Se leyó la pantalla actual.',
  resolution: 'Resolución', aspectRatio: 'Relación de aspecto', scale: 'Escala', unknown: 'Desconocida',
  combat: 'Áreas de combate', loot: 'Áreas de objetos', calibrateCombat: 'Calibrar áreas de combate', calibrateLoot: 'Calibrar áreas de objetos',
  hint: 'Revisa las áreas en la vista previa del juego real. La precisión del reconocimiento requiere una validación aparte.',
  statuses: { disabled: 'Reconocimiento desactivado', pending: 'Esperando la pantalla actual', missing: 'Calibración necesaria', compatible: 'La calibración coincide con la pantalla actual', invalid: 'Es necesario actualizar la calibración' },
  reasons: {
    'calibration-required': 'Carga una vista previa y guarda las áreas.', 'display-changed': 'Cambió la pantalla observada. Vuelve a calibrar.',
    'resolution-changed': 'Cambió la resolución. Vuelve a calibrar.', 'aspect-changed': 'Cambió la relación de aspecto. Vuelve a calibrar.',
    'scale-changed': 'Cambió la escala de la pantalla. Vuelve a calibrar.', 'geometry-changed': 'Cambió la posición, orientación o identidad de la pantalla. Vuelve a calibrar.',
    'topology-changed': 'Cambió la configuración de monitores. Vuelve a calibrar.', 'roi-too-large': 'Las áreas guardadas exceden los límites de píxeles o superficie. Reduce la selección.',
  },
};
const pt: StartupText = {
  title: 'Verificação ao iniciar', pending: 'Inicie a observação para verificar a tela atual e as áreas salvas.', checked: 'Tela atual lida.',
  resolution: 'Resolução', aspectRatio: 'Proporção', scale: 'Escala', unknown: 'Desconhecida',
  combat: 'Áreas de combate', loot: 'Áreas de itens', calibrateCombat: 'Calibrar áreas de combate', calibrateLoot: 'Calibrar áreas de itens',
  hint: 'Confira as áreas na prévia da tela real do jogo. A precisão do reconhecimento exige validação separada.',
  statuses: { disabled: 'Reconhecimento desativado', pending: 'Aguardando a tela atual', missing: 'Calibração necessária', compatible: 'A calibração corresponde à tela atual', invalid: 'A calibração precisa ser atualizada' },
  reasons: {
    'calibration-required': 'Carregue uma prévia e salve as áreas.', 'display-changed': 'A tela observada mudou. Calibre novamente.',
    'resolution-changed': 'A resolução mudou. Calibre novamente.', 'aspect-changed': 'A proporção da tela mudou. Calibre novamente.',
    'scale-changed': 'A escala da tela mudou. Calibre novamente.', 'geometry-changed': 'A posição, orientação ou identidade da tela mudou. Calibre novamente.',
    'topology-changed': 'A configuração dos monitores mudou. Calibre novamente.', 'roi-too-large': 'As áreas salvas excedem os limites de pixels ou superfície. Reduza a seleção.',
  },
};
const it: StartupText = {
  title: 'Verifica all’avvio', pending: 'Avvia l’osservazione per verificare lo schermo attuale e le aree salvate.', checked: 'Schermo attuale acquisito.',
  resolution: 'Risoluzione', aspectRatio: 'Proporzioni', scale: 'Ridimensionamento', unknown: 'Sconosciuto',
  combat: 'Aree di combattimento', loot: 'Aree degli oggetti', calibrateCombat: 'Calibra aree di combattimento', calibrateLoot: 'Calibra aree degli oggetti',
  hint: 'Verifica le aree nell’anteprima del gioco reale. La precisione del riconoscimento richiede una verifica separata.',
  statuses: { disabled: 'Riconoscimento disattivato', pending: 'In attesa dello schermo attuale', missing: 'Calibrazione necessaria', compatible: 'La calibrazione corrisponde allo schermo attuale', invalid: 'Calibrazione da aggiornare' },
  reasons: {
    'calibration-required': 'Carica un’anteprima e salva le aree.', 'display-changed': 'Lo schermo osservato è cambiato. Calibra di nuovo.',
    'resolution-changed': 'La risoluzione è cambiata. Calibra di nuovo.', 'aspect-changed': 'Le proporzioni sono cambiate. Calibra di nuovo.',
    'scale-changed': 'Il ridimensionamento dello schermo è cambiato. Calibra di nuovo.', 'geometry-changed': 'La posizione, l’orientamento o l’identità dello schermo sono cambiati. Calibra di nuovo.',
    'topology-changed': 'La configurazione dei monitor è cambiata. Calibra di nuovo.', 'roi-too-large': 'Le aree salvate superano i limiti di pixel o superficie. Riduci la selezione.',
  },
};
const ru: StartupText = {
  title: 'Проверка при запуске', pending: 'Начните наблюдение, чтобы проверить текущий экран и сохранённые области.', checked: 'Текущий экран получен.',
  resolution: 'Разрешение', aspectRatio: 'Соотношение сторон', scale: 'Масштаб', unknown: 'Неизвестен',
  combat: 'Области боя', loot: 'Области предметов', calibrateCombat: 'Калибровать области боя', calibrateLoot: 'Калибровать области предметов',
  hint: 'Проверьте области на предпросмотре реального экрана игры. Точность распознавания требует отдельной проверки.',
  statuses: { disabled: 'Распознавание отключено', pending: 'Ожидание текущего экрана', missing: 'Требуется калибровка', compatible: 'Калибровка соответствует текущему экрану', invalid: 'Нужно обновить калибровку' },
  reasons: {
    'calibration-required': 'Загрузите предпросмотр и сохраните области.', 'display-changed': 'Экран наблюдения изменился. Повторите калибровку.',
    'resolution-changed': 'Разрешение изменилось. Повторите калибровку.', 'aspect-changed': 'Соотношение сторон изменилось. Повторите калибровку.',
    'scale-changed': 'Масштаб экрана изменился. Повторите калибровку.', 'geometry-changed': 'Положение, ориентация или идентификатор экрана изменились. Повторите калибровку.',
    'topology-changed': 'Конфигурация мониторов изменилась. Повторите калибровку.', 'roi-too-large': 'Сохранённые области превышают лимиты пикселей или площади. Уменьшите выделение.',
  },
};
const TEXT: Record<Language, StartupText> = { zh, en, 'zh-Hant': zhHant, ja, ko, fr, de, 'es-419': es, 'pt-BR': pt, it, ru };
export function startupText(language: Language): StartupText { return TEXT[language]; }
