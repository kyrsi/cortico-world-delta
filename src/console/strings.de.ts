import type { en } from './strings.ts';

export const S: typeof en = {
  primary: "Hauptbildschirm",
  outputNumber: (number: number) => "Bildschirmausgang " + number,
  title: "Delta-Beobachtung",
  status: "Status",
  source: "Zu beobachtender Bildschirm",
  refresh: "Status aktualisieren",
  start: "Beobachtung starten",
  pause: "Beobachtung pausieren",
  stop: "Beobachtung stoppen",
  kind: "Testereignis",
  simulate: "Synthetischer Testimpuls",
  testHint: "Testet das Aufwecken mit erzeugten Bildern. Synthetische Tests bestätigen keine Spielereignisse.",
  latestEvent: "Letztes Ereignis",
  noEvents: "Noch keine Ereignisse.",
  synthetic: "Synthetischer Test",
  previewFull: "Ganzes Bild ansehen",
  previewCrop: "Ausschnitt ansehen",
  fullAlt: "Vollständiges Beweisbild",
  cropAlt: "Ausschnitt des Beweisbilds",
  loading: "Status wird gelesen…",
  notLoaded: "Die Beobachtungserweiterung ist nicht geladen.",
  inactive: "Die Beobachtungserweiterung ist nicht aktiviert.",
  missing: "Die Beobachtungserweiterung ist nicht verfügbar.",
  accepted: "Das synthetische Testereignis wurde angenommen.",
  rejected: "Das synthetische Testereignis wurde nicht angenommen.",
  deliveryHint: "Coo entscheidet, ob es auf das Ereignis antwortet.",
  kinds: {
    "kill": "Eliminierung",
    "knockdown": "Zu Boden gebracht",
    "loot": "Rote Beute"
  },
  combatKinds: {
    self: { kill: "Eigene Eliminierung", knockdown: "Eigener Niederschlag" },
    teammate: { kill: "Eliminierung durch Teammitglied", knockdown: "Niederschlag durch Teammitglied" },
    unknown: { kill: "Eliminierung (Zuordnung unbestätigt)", knockdown: "Niederschlag (Zuordnung unbestätigt)" }
  },
  attributionLabels: { assisted: "Assist-Meldung", spectating: "Zuschaueransicht" },
  phases: {
    "unbound": "Nicht mit der App verbunden",
    "stopped": "Gestoppt",
    "starting": "Startet",
    "running": "Beobachtet",
    "blocked": "Beobachtung blockiert",
    "error": "Beobachtungsfehler"
  },
  reasons: {
    "unbound": "Die Beobachtungserweiterung ist nicht mit der App verbunden.",
    "stopped": "Die Beobachtung ist gestoppt.",
    "paused": "Die Beobachtung wurde manuell pausiert.",
    "view-disabled": "Die Bildschirmansicht ist ausgeschaltet.",
    "observation-disabled": "Die Spielbeobachtung ist ausgeschaltet.",
    "view-permission": "Die aktuelle Berechtigung erlaubt keine dauerhafte Aufnahme.",
    "core-paused": "Core ist pausiert.",
    "no-output": "Die Sprechblasen des Haustiers sind nicht verfügbar.",
    "no-image-model": "Das aktuelle Modell akzeptiert keine Bilder.",
    "source-unavailable": "Der beobachtete Bildschirm ist nicht verfügbar.",
    "worker-failed": "Der Beobachtungsprozess kann nicht ausgeführt werden.",
    "heartbeat-timeout": "Der Beobachtungsprozess hat nicht rechtzeitig geantwortet."
  },
  dropReasons: {
    "expired": "Das Ereignis ist abgelaufen.",
    "duplicate": "Das doppelte Ereignis wurde ignoriert.",
    "overflow": "Die Grenze für ausstehende Ereignisse wurde überschritten.",
    "policy-changed": "Die Ansichtseinstellungen haben sich geändert.",
    "worker-failed": "Der Beobachtungsprozess ist fehlgeschlagen.",
    "source-changed": "Der beobachtete Bildschirm hat sich geändert."
  },
  eventStates: {
    "queued": "Wartet auf Zustellung",
    "delivered": "Zum Gespräch hinzugefügt",
    "dropped": "Nicht zugestellt"
  },
  stateFailed: (why: string) => "Status konnte nicht gelesen werden: " + why,
  previewFailed: (why: string) => "Beweisvorschau fehlgeschlagen: " + why,
  captures: (number: number) => "Aufgenommen: " + number + " Bilder",
  capturedAt: (time: string) => "Aufgenommen am " + time,
};
