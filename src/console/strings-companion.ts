import type { Language } from 'cortico/core/language.ts';
import { deltaText, type DeltaText } from '../i18n/index.ts';

const zh = {
  notTriggered: "未触发回应",
  formatHint: "UTF-8 Markdown；二级标题使用下列标记，例如“## [loot] 物品”。未标记的二级章节不会随事件发送。",
  knowledge: '游戏知识', source: '当前来源', builtin: '内置知识', imported: '已导入', version: '内容版本', bytes: '大小（字节）',
  import: '导入 .md 文件', view: '查看内容', hide: '收起内容', reload: '重新加载', restore: '恢复默认知识',
  importHint: '支持单个 .md 文件，最多 64 KiB。修改原文件后需重新导入。',
  knowledgeSaved: '游戏知识已更新。', knowledgeReloaded: '游戏知识已重新加载。', knowledgeRestored: '已恢复默认知识。',
  content: '知识内容', speech: '游戏回应', enabled: '启用游戏回应', probability: '随机回应概率（%）',
  cooldown: '最短回应间隔（秒）', eventKinds: '回应事件', relations: '战斗事件归属',
  relationLabels: { self: '本人', teammate: '队友', unknown: '归属未确认' },
  speechHint: '选中的事件按概率触发回应，Coo 仍会自行决定是否发言。间隔为 0 时关闭间隔限制。',
  save: '保存回应配置', saved: '回应配置已保存。', lastSelected: '最近唤醒', lastActivity: '最近模型活动', none: '暂无',
  dropReasons: {
    'speech-disabled': '已识别事件；游戏回应已关闭。', 'event-filtered': '已识别事件；此类事件未选择回应。',
    'attribution-filtered': '已识别事件；此类归属未选择回应。', 'probability': '已识别事件；本次随机未触发回应。',
    'cooldown': '已识别事件；回应间隔中。', 'recent-activity': '已识别事件；Coo 最近处理过内容，本次未触发回应。',
  },
};
type CompanionLabels = typeof zh;
export type CompanionText = CompanionLabels & { style: string; styles: DeltaText['speechStyles'] };
const en: CompanionLabels = {
  notTriggered: "Response not triggered",
  formatHint: "Use UTF-8 Markdown and the tags below in level-two headings, for example “## [loot] Items”. Untagged level-two sections are not sent with events.",
  knowledge: 'Game knowledge', source: 'Current source', builtin: 'Built-in knowledge', imported: 'Imported', version: 'Content version', bytes: 'Size (bytes)',
  import: 'Import .md file', view: 'View content', hide: 'Hide content', reload: 'Reload', restore: 'Restore default knowledge',
  importHint: 'One .md file, up to 64 KiB. Import again after editing the original file.',
  knowledgeSaved: 'Game knowledge updated.', knowledgeReloaded: 'Game knowledge reloaded.', knowledgeRestored: 'Default knowledge restored.',
  content: 'Knowledge content', speech: 'Game responses', enabled: 'Enable game responses', probability: 'Random response probability (%)',
  cooldown: 'Minimum response interval (seconds)', eventKinds: 'Events to respond to', relations: 'Combat event ownership',
  relationLabels: { self: 'You', teammate: 'Teammate', unknown: 'Unconfirmed ownership' },
  speechHint: 'Selected events trigger a response with this probability. Coo still decides whether to speak. Set the interval to 0 to disable it.',
  save: 'Save response settings', saved: 'Response settings saved.', lastSelected: 'Latest wakeup', lastActivity: 'Latest model activity', none: 'None yet',
  dropReasons: {
    'speech-disabled': 'Event recognized; game responses are off.', 'event-filtered': 'Event recognized; responses are off for this event type.',
    'attribution-filtered': 'Event recognized; responses are off for this ownership.', 'probability': 'Event recognized; not selected for a random response.',
    'cooldown': 'Event recognized; waiting for the response interval.', 'recent-activity': 'Event recognized; recent model activity prevented a new response.',
  },
};
const zhHant: CompanionLabels = {
  notTriggered: "未觸發回應",
  formatHint: "UTF-8 Markdown；二級標題使用下列標記，例如「## [loot] 物品」。未標記的二級章節不會隨事件傳送。",
  knowledge: '遊戲知識', source: '目前來源', builtin: '內建知識', imported: '已匯入', version: '內容版本', bytes: '大小（位元組）',
  import: '匯入 .md 檔案', view: '查看內容', hide: '收起內容', reload: '重新載入', restore: '恢復預設知識',
  importHint: '支援單一 .md 檔案，最多 64 KiB。修改原檔案後須重新匯入。',
  knowledgeSaved: '遊戲知識已更新。', knowledgeReloaded: '遊戲知識已重新載入。', knowledgeRestored: '已恢復預設知識。',
  content: '知識內容', speech: '遊戲回應', enabled: '啟用遊戲回應', probability: '隨機回應機率（%）',
  cooldown: '最短回應間隔（秒）', eventKinds: '回應事件', relations: '戰鬥事件歸屬',
  relationLabels: { self: '本人', teammate: '隊友', unknown: '歸屬未確認' },
  speechHint: '選擇的事件依機率觸發回應，Coo 仍會自行決定是否發言。間隔設為 0 時關閉間隔限制。',
  save: '儲存回應配置', saved: '回應配置已儲存。', lastSelected: '最近喚醒', lastActivity: '最近模型活動', none: '暫無',
  dropReasons: {
    'speech-disabled': '已辨識事件；遊戲回應已關閉。', 'event-filtered': '已辨識事件；此類事件未選擇回應。',
    'attribution-filtered': '已辨識事件；此類歸屬未選擇回應。', 'probability': '已辨識事件；本次隨機未觸發回應。',
    'cooldown': '已辨識事件；回應間隔中。', 'recent-activity': '已辨識事件；Coo 最近處理過內容，本次未觸發回應。',
  },
};
const ja: CompanionLabels = {
  notTriggered: "反応は開始されませんでした",
  formatHint: "UTF-8 の Markdown を使用し、見出しレベル 2 に下記のタグを付けてください。例：「## [loot] アイテム」。タグのないレベル 2 の節はイベントに添付されません。",
  knowledge: 'ゲーム知識', source: '現在のソース', builtin: '内蔵の知識', imported: 'インポート済み', version: '内容のバージョン', bytes: 'サイズ（バイト）',
  import: '.md ファイルをインポート', view: '内容を表示', hide: '内容を閉じる', reload: '再読み込み', restore: '既定の知識に戻す',
  importHint: '64 KiB 以下の .md ファイルを 1 つ指定できます。元のファイルを編集したら、再度インポートしてください。',
  knowledgeSaved: 'ゲーム知識を更新しました。', knowledgeReloaded: 'ゲーム知識を再読み込みしました。', knowledgeRestored: '既定の知識に戻しました。',
  content: '知識の内容', speech: 'ゲームへの反応', enabled: 'ゲームへの反応を有効化', probability: 'ランダムに反応する確率（%）',
  cooldown: '反応の最短間隔（秒）', eventKinds: '反応するイベント', relations: '戦闘イベントの主体',
  relationLabels: { self: '本人', teammate: '味方', unknown: '主体未確認' },
  speechHint: '選択したイベントにこの確率で反応します。発言するかは Coo が判断します。間隔を 0 にすると間隔制限が無効になります。',
  save: '反応の設定を保存', saved: '反応の設定を保存しました。', lastSelected: '前回の呼び出し', lastActivity: '前回のモデル動作', none: 'まだありません',
  dropReasons: {
    'speech-disabled': 'イベントを認識しました。ゲームへの反応は無効です。', 'event-filtered': 'イベントを認識しました。この種類への反応は選択されていません。',
    'attribution-filtered': 'イベントを認識しました。この主体への反応は選択されていません。', 'probability': 'イベントを認識しました。今回はランダムな反応の対象になりませんでした。',
    'cooldown': 'イベントを認識しました。次の反応まで待機中です。', 'recent-activity': 'イベントを認識しました。モデルが直前に動作したため、新たな反応は開始しません。',
  },
};
const ko: CompanionLabels = {
  notTriggered: "반응이 시작되지 않음",
  formatHint: "UTF-8 Markdown의 2단계 제목에 아래 태그를 사용하세요. 예: “## [loot] 아이템”. 태그 없는 2단계 섹션은 이벤트와 함께 전송되지 않습니다.",
  knowledge: '게임 지식', source: '현재 출처', builtin: '기본 지식', imported: '가져옴', version: '내용 버전', bytes: '크기(바이트)',
  import: '.md 파일 가져오기', view: '내용 보기', hide: '내용 접기', reload: '다시 불러오기', restore: '기본 지식 복원',
  importHint: '최대 64 KiB의 .md 파일 하나를 지원합니다. 원본 파일을 수정한 후 다시 가져오세요.',
  knowledgeSaved: '게임 지식이 업데이트되었습니다.', knowledgeReloaded: '게임 지식을 다시 불러왔습니다.', knowledgeRestored: '기본 지식이 복원되었습니다.',
  content: '지식 내용', speech: '게임 반응', enabled: '게임 반응 사용', probability: '무작위 반응 확률(%)',
  cooldown: '최소 반응 간격(초)', eventKinds: '반응할 이벤트', relations: '전투 이벤트 주체',
  relationLabels: { self: '본인', teammate: '팀원', unknown: '주체 미확인' },
  speechHint: '선택한 이벤트에 이 확률로 반응합니다. 말할지는 Coo가 결정합니다. 간격을 0으로 설정하면 간격 제한이 해제됩니다.',
  save: '반응 설정 저장', saved: '반응 설정이 저장되었습니다.', lastSelected: '최근 호출', lastActivity: '최근 모델 활동', none: '아직 없음',
  dropReasons: {
    'speech-disabled': '이벤트가 인식되었습니다. 게임 반응이 꺼져 있습니다.', 'event-filtered': '이벤트가 인식되었습니다. 이 종류는 반응 대상으로 선택되지 않았습니다.',
    'attribution-filtered': '이벤트가 인식되었습니다. 이 주체는 반응 대상으로 선택되지 않았습니다.', 'probability': '이벤트가 인식되었습니다. 이번 무작위 반응 대상으로 선택되지 않았습니다.',
    'cooldown': '이벤트가 인식되었습니다. 다음 반응 간격을 기다리고 있습니다.', 'recent-activity': '이벤트가 인식되었습니다. 최근 모델 활동으로 새 반응이 시작되지 않았습니다.',
  },
};
const fr: CompanionLabels = {
  notTriggered: "Réaction non déclenchée",
  formatHint: "Utilisez Markdown en UTF-8 et les balises ci-dessous dans les titres de niveau 2, par exemple « ## [loot] Objets ». Les sections de niveau 2 sans balise ne sont pas envoyées avec les événements.",
  knowledge: 'Connaissances du jeu', source: 'Source actuelle', builtin: 'Connaissances intégrées', imported: 'Importées', version: 'Version du contenu', bytes: 'Taille (octets)',
  import: 'Importer un fichier .md', view: 'Voir le contenu', hide: 'Masquer le contenu', reload: 'Recharger', restore: 'Restaurer les connaissances par défaut',
  importHint: 'Un fichier .md de 64 Kio maximum. Réimportez-le après avoir modifié le fichier original.',
  knowledgeSaved: 'Connaissances du jeu mises à jour.', knowledgeReloaded: 'Connaissances du jeu rechargées.', knowledgeRestored: 'Connaissances par défaut restaurées.',
  content: 'Contenu des connaissances', speech: 'Réactions au jeu', enabled: 'Activer les réactions au jeu', probability: 'Probabilité de réaction aléatoire (%)',
  cooldown: 'Intervalle minimal entre réactions (secondes)', eventKinds: 'Événements suscitant une réaction', relations: 'Auteur des actions de combat',
  relationLabels: { self: 'Vous', teammate: 'Coéquipier', unknown: 'Auteur non confirmé' },
  speechHint: 'Les événements sélectionnés déclenchent une réaction selon cette probabilité. Coo décide toujours de parler ou non. Un intervalle de 0 désactive cette limite.',
  save: 'Enregistrer les réactions', saved: 'Réglages des réactions enregistrés.', lastSelected: 'Dernier réveil', lastActivity: 'Dernière activité du modèle', none: 'Aucun pour le moment',
  dropReasons: {
    'speech-disabled': 'Événement reconnu ; les réactions au jeu sont désactivées.', 'event-filtered': 'Événement reconnu ; ce type ne suscite pas de réaction.',
    'attribution-filtered': 'Événement reconnu ; cet auteur ne suscite pas de réaction.', 'probability': 'Événement reconnu ; non sélectionné pour une réaction aléatoire.',
    'cooldown': 'Événement reconnu ; attente du prochain intervalle de réaction.', 'recent-activity': 'Événement reconnu ; l’activité récente du modèle a empêché une nouvelle réaction.',
  },
};
const de: CompanionLabels = {
  notTriggered: "Keine Reaktion ausgelöst",
  formatHint: "Verwenden Sie UTF-8-Markdown und die folgenden Tags in Überschriften der Ebene 2, etwa „## [loot] Gegenstände“. Abschnitte der Ebene 2 ohne Tag werden nicht mit Ereignissen gesendet.",
  knowledge: 'Spielwissen', source: 'Aktuelle Quelle', builtin: 'Mitgeliefertes Wissen', imported: 'Importiert', version: 'Inhaltsversion', bytes: 'Größe (Bytes)',
  import: '.md-Datei importieren', view: 'Inhalt anzeigen', hide: 'Inhalt ausblenden', reload: 'Neu laden', restore: 'Standardwissen wiederherstellen',
  importHint: 'Eine .md-Datei mit höchstens 64 KiB. Nach Änderungen an der Originaldatei erneut importieren.',
  knowledgeSaved: 'Spielwissen aktualisiert.', knowledgeReloaded: 'Spielwissen neu geladen.', knowledgeRestored: 'Standardwissen wiederhergestellt.',
  content: 'Wissensinhalt', speech: 'Spielreaktionen', enabled: 'Spielreaktionen aktivieren', probability: 'Zufällige Reaktionswahrscheinlichkeit (%)',
  cooldown: 'Mindestabstand zwischen Reaktionen (Sekunden)', eventKinds: 'Ereignisse für Reaktionen', relations: 'Urheber der Kampfereignisse',
  relationLabels: { self: 'Sie selbst', teammate: 'Teammitglied', unknown: 'Urheber unbestätigt' },
  speechHint: 'Ausgewählte Ereignisse lösen mit dieser Wahrscheinlichkeit eine Reaktion aus. Coo entscheidet weiterhin, ob es spricht. Ein Abstand von 0 deaktiviert die Begrenzung.',
  save: 'Reaktionseinstellungen speichern', saved: 'Reaktionseinstellungen gespeichert.', lastSelected: 'Letzte Aktivierung', lastActivity: 'Letzte Modellaktivität', none: 'Noch keine',
  dropReasons: {
    'speech-disabled': 'Ereignis erkannt; Spielreaktionen sind deaktiviert.', 'event-filtered': 'Ereignis erkannt; Reaktionen auf diesen Typ sind deaktiviert.',
    'attribution-filtered': 'Ereignis erkannt; Reaktionen auf diesen Urheber sind deaktiviert.', 'probability': 'Ereignis erkannt; nicht für eine zufällige Reaktion ausgewählt.',
    'cooldown': 'Ereignis erkannt; der Reaktionsabstand läuft noch.', 'recent-activity': 'Ereignis erkannt; kürzliche Modellaktivität verhindert eine neue Reaktion.',
  },
};
const es: CompanionLabels = {
  notTriggered: "No se activó una respuesta",
  formatHint: "Usa Markdown UTF-8 y estas etiquetas en títulos de nivel 2, por ejemplo “## [loot] Objetos”. Las secciones de nivel 2 sin etiqueta no se envían con los eventos.",
  knowledge: 'Conocimientos del juego', source: 'Fuente actual', builtin: 'Conocimientos incluidos', imported: 'Importados', version: 'Versión del contenido', bytes: 'Tamaño (bytes)',
  import: 'Importar archivo .md', view: 'Ver contenido', hide: 'Ocultar contenido', reload: 'Volver a cargar', restore: 'Restaurar conocimientos predeterminados',
  importHint: 'Un archivo .md de hasta 64 KiB. Vuelve a importarlo si editas el archivo original.',
  knowledgeSaved: 'Conocimientos del juego actualizados.', knowledgeReloaded: 'Conocimientos del juego cargados de nuevo.', knowledgeRestored: 'Conocimientos predeterminados restaurados.',
  content: 'Contenido de conocimientos', speech: 'Respuestas al juego', enabled: 'Activar respuestas al juego', probability: 'Probabilidad de respuesta aleatoria (%)',
  cooldown: 'Intervalo mínimo entre respuestas (segundos)', eventKinds: 'Eventos que reciben respuesta', relations: 'Autor de eventos de combate',
  relationLabels: { self: 'Tú', teammate: 'Compañero', unknown: 'Autor sin confirmar' },
  speechHint: 'Los eventos seleccionados generan una respuesta con esta probabilidad. Coo decide si hablar. Un intervalo de 0 desactiva el límite.',
  save: 'Guardar respuestas', saved: 'Configuración de respuestas guardada.', lastSelected: 'Última activación', lastActivity: 'Última actividad del modelo', none: 'Todavía ninguna',
  dropReasons: {
    'speech-disabled': 'Evento reconocido; las respuestas al juego están desactivadas.', 'event-filtered': 'Evento reconocido; este tipo no está seleccionado para responder.',
    'attribution-filtered': 'Evento reconocido; este autor no está seleccionado para responder.', 'probability': 'Evento reconocido; no se seleccionó para una respuesta aleatoria.',
    'cooldown': 'Evento reconocido; esperando el intervalo entre respuestas.', 'recent-activity': 'Evento reconocido; la actividad reciente del modelo impidió una nueva respuesta.',
  },
};
const pt: CompanionLabels = {
  notTriggered: "Resposta não acionada",
  formatHint: "Use Markdown UTF-8 e as tags abaixo em títulos de nível 2, por exemplo “## [loot] Itens”. Seções de nível 2 sem tag não são enviadas com os eventos.",
  knowledge: 'Conhecimentos do jogo', source: 'Fonte atual', builtin: 'Conhecimentos incluídos', imported: 'Importados', version: 'Versão do conteúdo', bytes: 'Tamanho (bytes)',
  import: 'Importar arquivo .md', view: 'Ver conteúdo', hide: 'Ocultar conteúdo', reload: 'Recarregar', restore: 'Restaurar conhecimentos padrão',
  importHint: 'Um arquivo .md de até 64 KiB. Importe novamente após editar o arquivo original.',
  knowledgeSaved: 'Conhecimentos do jogo atualizados.', knowledgeReloaded: 'Conhecimentos do jogo recarregados.', knowledgeRestored: 'Conhecimentos padrão restaurados.',
  content: 'Conteúdo dos conhecimentos', speech: 'Respostas ao jogo', enabled: 'Ativar respostas ao jogo', probability: 'Probabilidade de resposta aleatória (%)',
  cooldown: 'Intervalo mínimo entre respostas (segundos)', eventKinds: 'Eventos que recebem resposta', relations: 'Autor dos eventos de combate',
  relationLabels: { self: 'Você', teammate: 'Colega de equipe', unknown: 'Autor não confirmado' },
  speechHint: 'Os eventos selecionados geram uma resposta com esta probabilidade. Coo decide se vai falar. Um intervalo de 0 desativa o limite.',
  save: 'Salvar respostas', saved: 'Configurações de resposta salvas.', lastSelected: 'Última ativação', lastActivity: 'Última atividade do modelo', none: 'Nenhuma ainda',
  dropReasons: {
    'speech-disabled': 'Evento reconhecido; as respostas ao jogo estão desativadas.', 'event-filtered': 'Evento reconhecido; este tipo não foi selecionado para resposta.',
    'attribution-filtered': 'Evento reconhecido; este autor não foi selecionado para resposta.', 'probability': 'Evento reconhecido; não foi selecionado para uma resposta aleatória.',
    'cooldown': 'Evento reconhecido; aguardando o intervalo entre respostas.', 'recent-activity': 'Evento reconhecido; a atividade recente do modelo impediu uma nova resposta.',
  },
};
const it: CompanionLabels = {
  notTriggered: "Reazione non avviata",
  formatHint: "Usa Markdown UTF-8 e i tag seguenti nei titoli di livello 2, ad esempio “## [loot] Oggetti”. Le sezioni di livello 2 senza tag non vengono inviate con gli eventi.",
  knowledge: 'Conoscenze del gioco', source: 'Fonte attuale', builtin: 'Conoscenze incluse', imported: 'Importate', version: 'Versione del contenuto', bytes: 'Dimensione (byte)',
  import: 'Importa file .md', view: 'Mostra contenuto', hide: 'Nascondi contenuto', reload: 'Ricarica', restore: 'Ripristina conoscenze predefinite',
  importHint: 'Un file .md fino a 64 KiB. Importalo di nuovo dopo aver modificato il file originale.',
  knowledgeSaved: 'Conoscenze del gioco aggiornate.', knowledgeReloaded: 'Conoscenze del gioco ricaricate.', knowledgeRestored: 'Conoscenze predefinite ripristinate.',
  content: 'Contenuto delle conoscenze', speech: 'Reazioni al gioco', enabled: 'Attiva reazioni al gioco', probability: 'Probabilità di reazione casuale (%)',
  cooldown: 'Intervallo minimo tra reazioni (secondi)', eventKinds: 'Eventi a cui reagire', relations: 'Autore degli eventi di combattimento',
  relationLabels: { self: 'Tu', teammate: 'Compagno', unknown: 'Autore non confermato' },
  speechHint: 'Gli eventi selezionati suscitano una reazione con questa probabilità. Coo decide comunque se parlare. Un intervallo di 0 disattiva il limite.',
  save: 'Salva impostazioni delle reazioni', saved: 'Impostazioni delle reazioni salvate.', lastSelected: 'Ultima attivazione', lastActivity: 'Ultima attività del modello', none: 'Ancora nessuno',
  dropReasons: {
    'speech-disabled': 'Evento riconosciuto; le reazioni al gioco sono disattivate.', 'event-filtered': 'Evento riconosciuto; questo tipo non è selezionato per le reazioni.',
    'attribution-filtered': 'Evento riconosciuto; questo autore non è selezionato per le reazioni.', 'probability': 'Evento riconosciuto; non selezionato per una reazione casuale.',
    'cooldown': 'Evento riconosciuto; attesa dell’intervallo tra le reazioni.', 'recent-activity': 'Evento riconosciuto; l’attività recente del modello ha impedito una nuova reazione.',
  },
};
const ru: CompanionLabels = {
  notTriggered: "Реакция не запущена",
  formatHint: "Используйте Markdown в UTF-8 и следующие метки в заголовках второго уровня, например «## [loot] Предметы». Разделы второго уровня без метки не отправляются вместе с событиями.",
  knowledge: 'Знания об игре', source: 'Текущий источник', builtin: 'Встроенные знания', imported: 'Импортировано', version: 'Версия содержимого', bytes: 'Размер (байты)',
  import: 'Импортировать файл .md', view: 'Показать содержимое', hide: 'Скрыть содержимое', reload: 'Перезагрузить', restore: 'Восстановить исходные знания',
  importHint: 'Один файл .md размером до 64 КиБ. После изменения исходного файла импортируйте его снова.',
  knowledgeSaved: 'Знания об игре обновлены.', knowledgeReloaded: 'Знания об игре перезагружены.', knowledgeRestored: 'Исходные знания восстановлены.',
  content: 'Содержимое знаний', speech: 'Реакции на игру', enabled: 'Включить реакции на игру', probability: 'Вероятность случайной реакции (%)',
  cooldown: 'Минимальный интервал между реакциями (секунды)', eventKinds: 'События для реакции', relations: 'Участник боевых событий',
  relationLabels: { self: 'Вы', teammate: 'Союзник', unknown: 'Участник не подтверждён' },
  speechHint: 'Выбранные события вызывают реакцию с указанной вероятностью. Coo решает, говорить ли. Интервал 0 отключает это ограничение.',
  save: 'Сохранить настройки реакций', saved: 'Настройки реакций сохранены.', lastSelected: 'Последнее пробуждение', lastActivity: 'Последняя активность модели', none: 'Пока нет',
  dropReasons: {
    'speech-disabled': 'Событие распознано; реакции на игру отключены.', 'event-filtered': 'Событие распознано; этот тип не выбран для реакции.',
    'attribution-filtered': 'Событие распознано; этот участник не выбран для реакции.', 'probability': 'Событие распознано; случайная реакция не выбрана.',
    'cooldown': 'Событие распознано; ожидание интервала между реакциями.', 'recent-activity': 'Событие распознано; недавняя активность модели не позволила начать новую реакцию.',
  },
};
const TEXT: Record<Language, CompanionLabels> = { zh, en, 'zh-Hant': zhHant, ja, ko, fr, de, 'es-419': es, 'pt-BR': pt, it, ru };
export function companionText(language: Language): CompanionText {
  const { speechStyle, speechStyles } = deltaText(language);
  return { ...TEXT[language], style: speechStyle, styles: speechStyles };
}
