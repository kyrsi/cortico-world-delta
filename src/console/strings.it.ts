import type { en } from './strings.ts';

export const S: typeof en = {
  primary: "Principale",
  outputNumber: (number: number) => "Uscita video " + number,
  title: "Osservazione Delta",
  status: "Stato",
  source: "Schermo da osservare",
  refresh: "Aggiorna stato",
  start: "Avvia osservazione",
  pause: "Sospendi osservazione",
  stop: "Ferma osservazione",
  kind: "Evento di test",
  simulate: "Attivazione di test sintetico",
  testHint: "Prova l’attivazione con immagini generate. I test sintetici non confermano eventi di gioco.",
  latestEvent: "Ultimo evento",
  noEvents: "Ancora nessun evento.",
  synthetic: "Test sintetico",
  previewFull: "Mostra immagine intera",
  previewCrop: "Mostra ritaglio",
  fullAlt: "Prova completa dell’evento",
  cropAlt: "Prova ritagliata dell’evento",
  loading: "Lettura dello stato…",
  notLoaded: "L’estensione di osservazione non è caricata.",
  inactive: "L’estensione di osservazione non è attivata.",
  missing: "L’estensione di osservazione non è disponibile.",
  accepted: "L’evento di test sintetico è stato accettato.",
  rejected: "L’evento di test sintetico non è stato accettato.",
  deliveryHint: "Coo decide se rispondere all’evento.",
  kinds: {
    "kill": "Eliminazione",
    "knockdown": "Atterramento",
    "loot": "Bottino di rarità rossa"
  },
  combatKinds: {
    self: { kill: "Tua eliminazione", knockdown: "Tuo atterramento" },
    teammate: { kill: "Eliminazione da parte di un compagno", knockdown: "Atterramento da parte di un compagno" },
    unknown: { kill: "Eliminazione (autore non confermato)", knockdown: "Atterramento (autore non confermato)" }
  },
  attributionLabels: { assisted: "Avviso di assistenza", spectating: "Visuale spettatore" },
  phases: {
    "unbound": "Non connessa all’app",
    "stopped": "Ferma",
    "starting": "Avvio in corso",
    "running": "Osservazione in corso",
    "blocked": "Osservazione bloccata",
    "error": "Errore di osservazione"
  },
  reasons: {
    "unbound": "L’estensione di osservazione non è connessa all’app.",
    "stopped": "L’osservazione è ferma.",
    "paused": "L’osservazione è stata sospesa manualmente.",
    "view-disabled": "La visualizzazione dello schermo è disattivata.",
    "observation-disabled": "L’osservazione del gioco è disattivata.",
    "view-permission": "Il permesso attuale non consente acquisizioni continue.",
    "core-paused": "Core è in pausa.",
    "no-output": "I fumetti del pet non sono disponibili.",
    "no-image-model": "Il modello attuale non accetta immagini.",
    "source-unavailable": "Lo schermo da osservare non è disponibile.",
    "worker-failed": "Il processo di osservazione non può essere eseguito.",
    "heartbeat-timeout": "Il processo di osservazione non ha risposto in tempo."
  },
  dropReasons: {
    "expired": "L’evento è scaduto.",
    "duplicate": "L’evento duplicato è stato ignorato.",
    "overflow": "È stato superato il limite degli eventi in attesa.",
    "policy-changed": "Le impostazioni di visualizzazione sono cambiate.",
    "worker-failed": "Il processo di osservazione ha avuto un errore.",
    "source-changed": "Lo schermo osservato è cambiato."
  },
  eventStates: {
    "queued": "In attesa di consegna",
    "delivered": "Aggiunto alla conversazione",
    "dropped": "Non consegnato"
  },
  stateFailed: (why: string) => "Impossibile leggere lo stato: " + why,
  previewFailed: (why: string) => "Anteprima della prova non riuscita: " + why,
  captures: (number: number) => "Acquisiti: " + number + " fotogrammi",
  capturedAt: (time: string) => "Acquisito il " + time,
};
