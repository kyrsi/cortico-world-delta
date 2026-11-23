import type { Language } from 'cortico/core/language.ts';

const en = {
  standalone: 'World screen capture', host: 'Coopanion screen capture', unsupported: 'Screen capture is unavailable on this platform.',
  choose: 'Select a display', refresh: 'Refresh displays', empty: 'No displays found.',
  grant: 'Allow viewing this display and start', consent: 'This World reads the selected display periodically and can send event screenshots to Coo’s model. Pause or stop here to revoke access.',
  pauseCapture: 'Pausing Coo does not stop standalone screen capture; pause or stop observation here to stop capturing.',
};

const TEXT: Record<Language, typeof en> = {
  en,
  zh: {
    standalone: 'World 独立采集', host: 'Coopanion 屏幕采集', unsupported: '当前平台没有可用的屏幕采集来源。',
    choose: '选择显示器', refresh: '刷新显示器', empty: '未找到显示器。',
    grant: '允许读取此屏并开始观察', consent: '此 World 会定时读取所选屏幕，触发事件时可将截图发送给 Coo 使用的模型。在此处暂停或停止观察即可撤回授权。',
    pauseCapture: '暂停 Coo 不会停止独立屏幕采集，请在此面板暂停或停止观察。',
  },
  'zh-Hant': {
    standalone: 'World 獨立擷取', host: 'Coopanion 螢幕擷取', unsupported: '目前平台沒有可用的螢幕擷取來源。',
    choose: '選擇顯示器', refresh: '重新整理顯示器', empty: '找不到顯示器。',
    grant: '允許讀取此螢幕並開始觀察', consent: '此 World 會定期讀取所選螢幕，事件觸發時可將截圖傳給 Coo 使用的模型。在這裡暫停或停止觀察即可撤回授權。',
    pauseCapture: '暫停 Coo 不會停止獨立螢幕擷取，請在此面板暫停或停止觀察。',
  },
  ja: {
    standalone: 'World による画面キャプチャ', host: 'Coopanion による画面キャプチャ', unsupported: 'この環境では画面を取得できません。',
    choose: 'ディスプレイを選択', refresh: 'ディスプレイ一覧を更新', empty: 'ディスプレイが見つかりません。',
    grant: 'この画面の読み取りを許可して観察を開始', consent: 'この World は選択した画面を定期的に読み取り、イベント発生時にスクリーンショットを Coo のモデルに送信することがあります。ここで観察を一時停止または停止すると許可を取り消せます。',
    pauseCapture: 'Coo を一時停止しても World による画面キャプチャは停止しないため、ここで観察を一時停止または停止してください。',
  },
  ko: {
    standalone: 'World 화면 캡처', host: 'Coopanion 화면 캡처', unsupported: '이 플랫폼에서는 화면을 캡처할 수 없습니다.',
    choose: '디스플레이 선택', refresh: '디스플레이 새로 고침', empty: '디스플레이를 찾을 수 없습니다.',
    grant: '이 화면 읽기를 허용하고 관찰 시작', consent: '이 World는 선택한 화면을 주기적으로 읽고 이벤트 발생 시 스크린샷을 Coo의 모델로 보낼 수 있습니다. 여기서 관찰을 일시 중지하거나 중지하면 권한이 해제됩니다.',
    pauseCapture: 'Coo를 일시 중지해도 World 화면 캡처는 멈추지 않으므로, 여기서 관찰을 일시 중지하거나 중지하세요.',
  },
  de: {
    standalone: 'Bildschirmaufnahme durch die World', host: 'Bildschirmaufnahme durch Coopanion', unsupported: 'Die Bildschirmaufnahme ist auf dieser Plattform nicht verfügbar.',
    choose: 'Bildschirm auswählen', refresh: 'Bildschirme aktualisieren', empty: 'Keine Bildschirme gefunden.',
    grant: 'Bildschirmzugriff erlauben und Beobachtung starten', consent: 'Diese World liest den gewählten Bildschirm regelmäßig und kann bei Ereignissen Bildschirmfotos an Coos Modell senden. Pausieren oder beenden Sie hier die Beobachtung, um den Zugriff zu widerrufen.',
    pauseCapture: 'Coo zu pausieren stoppt die Bildschirmaufnahme durch die World nicht; pausieren oder beenden Sie die Beobachtung hier, um die Aufnahme zu stoppen.',
  },
  fr: {
    standalone: 'Capture par le World', host: 'Capture par Coopanion', unsupported: 'La capture d’écran est indisponible sur cette plateforme.',
    choose: 'Choisir un écran', refresh: 'Actualiser les écrans', empty: 'Aucun écran détecté.',
    grant: 'Autoriser la lecture de cet écran et démarrer', consent: 'Ce World lit régulièrement l’écran choisi et peut envoyer des captures au modèle de Coo lors d’un événement. Mettez l’observation en pause ou arrêtez-la ici pour retirer l’autorisation.',
    pauseCapture: 'Mettre Coo en pause n’arrête pas la capture du World ; mettez l’observation en pause ou arrêtez-la ici pour arrêter la capture.',
  },
  it: {
    standalone: 'Acquisizione tramite World', host: 'Acquisizione tramite Coopanion', unsupported: 'L’acquisizione dello schermo non è disponibile su questa piattaforma.',
    choose: 'Seleziona uno schermo', refresh: 'Aggiorna gli schermi', empty: 'Nessuno schermo rilevato.',
    grant: 'Consenti la lettura dello schermo e avvia', consent: 'Questo World legge periodicamente lo schermo selezionato e può inviare schermate degli eventi al modello di Coo. Metti in pausa o interrompi qui l’osservazione per revocare l’accesso.',
    pauseCapture: 'Mettere Coo in pausa non interrompe l’acquisizione del World; metti in pausa o interrompi qui l’osservazione per fermare l’acquisizione.',
  },
  'es-419': {
    standalone: 'Captura del World', host: 'Captura de Coopanion', unsupported: 'La captura de pantalla no está disponible en esta plataforma.',
    choose: 'Seleccionar pantalla', refresh: 'Actualizar pantallas', empty: 'No se encontraron pantallas.',
    grant: 'Permitir la lectura de esta pantalla e iniciar', consent: 'Este World lee periódicamente la pantalla seleccionada y puede enviar capturas de los eventos al modelo de Coo. Pausa o detén la observación aquí para revocar el acceso.',
    pauseCapture: 'Pausar a Coo no detiene la captura del World; pausa o detén la observación aquí para detener la captura.',
  },
  'pt-BR': {
    standalone: 'Captura pelo World', host: 'Captura pelo Coopanion', unsupported: 'A captura de tela está indisponível nesta plataforma.',
    choose: 'Selecionar tela', refresh: 'Atualizar telas', empty: 'Nenhuma tela encontrada.',
    grant: 'Permitir a leitura desta tela e iniciar', consent: 'Este World lê a tela selecionada periodicamente e pode enviar capturas de eventos ao modelo do Coo. Pause ou encerre a observação aqui para revogar o acesso.',
    pauseCapture: 'Pausar o Coo não interrompe a captura do World; pause ou encerre a observação aqui para parar a captura.',
  },
  ru: {
    standalone: 'Захват экрана через World', host: 'Захват экрана через Coopanion', unsupported: 'На этой платформе захват экрана недоступен.',
    choose: 'Выбрать монитор', refresh: 'Обновить список мониторов', empty: 'Мониторы не найдены.',
    grant: 'Разрешить чтение экрана и начать наблюдение', consent: 'Этот World периодически считывает выбранный экран и может отправлять снимки событий модели Coo. Чтобы отозвать доступ, приостановите или остановите наблюдение здесь.',
    pauseCapture: 'Пауза Coo не останавливает захват экрана через World; чтобы остановить захват, приостановите или остановите наблюдение здесь.',
  },
};

export function captureText(language: Language): typeof en { return TEXT[language]; }
