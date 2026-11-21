import type { en } from './strings.ts';

export const S: typeof en = {
  primary: "Principal",
  outputNumber: (number: number) => "Sortie d’affichage " + number,
  title: "Observation Delta",
  status: "État",
  source: "Écran à observer",
  refresh: "Actualiser l’état",
  start: "Démarrer l’observation",
  pause: "Suspendre l’observation",
  stop: "Arrêter l’observation",
  kind: "Événement de test",
  simulate: "Réveil de test synthétique",
  testHint: "Teste le réveil avec des images générées. Les tests synthétiques ne confirment pas les événements du jeu.",
  latestEvent: "Dernier événement",
  noEvents: "Aucun événement pour le moment.",
  synthetic: "Test synthétique",
  previewFull: "Voir l’image entière",
  previewCrop: "Voir le recadrage",
  fullAlt: "Preuve complète de l’événement",
  cropAlt: "Preuve recadrée de l’événement",
  loading: "Lecture de l’état…",
  notLoaded: "L’extension d’observation n’est pas chargée.",
  inactive: "L’extension d’observation n’est pas activée.",
  missing: "L’extension d’observation est indisponible.",
  accepted: "L’événement de test synthétique a été accepté.",
  rejected: "L’événement de test synthétique n’a pas été accepté.",
  deliveryHint: "Coo décide de répondre ou non à l’événement.",
  kinds: {
    "kill": "Élimination",
    "knockdown": "Mise à terre",
    "loot": "Butin de rareté rouge"
  },
  combatKinds: {
    self: { kill: "Élimination (vous)", knockdown: "Mise à terre (vous)" },
    teammate: { kill: "Élimination (coéquipier)", knockdown: "Mise à terre (coéquipier)" },
    unknown: { kill: "Élimination (attribution non confirmée)", knockdown: "Mise à terre (attribution non confirmée)" }
  },
  attributionLabels: { assisted: "Notification d’assistance", spectating: "Vue spectateur" },
  phases: {
    "unbound": "Non connecté à l’application",
    "stopped": "Arrêté",
    "starting": "Démarrage",
    "running": "Observation en cours",
    "blocked": "Observation bloquée",
    "error": "Erreur d’observation"
  },
  reasons: {
    "unbound": "L’extension d’observation n’est pas connectée à l’application.",
    "stopped": "L’observation est arrêtée.",
    "paused": "L’observation a été suspendue manuellement.",
    "view-disabled": "La visualisation de l’écran est désactivée.",
    "observation-disabled": "L’observation du jeu est désactivée.",
    "view-permission": "La permission actuelle ne permet pas la capture continue.",
    "core-paused": "Core est en pause.",
    "no-output": "Les bulles du compagnon sont indisponibles.",
    "no-image-model": "Le modèle actuel n’accepte pas les images.",
    "source-unavailable": "L’écran à observer est indisponible.",
    "worker-failed": "Le processus d’observation ne peut pas fonctionner.",
    "heartbeat-timeout": "Le processus d’observation n’a pas répondu à temps."
  },
  dropReasons: {
    "expired": "L’événement a expiré.",
    "duplicate": "L’événement en double a été ignoré.",
    "overflow": "La limite d’événements en attente a été dépassée.",
    "policy-changed": "Les réglages de visualisation ont changé.",
    "worker-failed": "Le processus d’observation a échoué.",
    "source-changed": "L’écran observé a changé."
  },
  eventStates: {
    "queued": "En attente de transmission",
    "delivered": "Ajouté à la conversation",
    "dropped": "Non transmis"
  },
  stateFailed: (why: string) => "Impossible de lire l’état : " + why,
  previewFailed: (why: string) => "Échec de l’aperçu de la preuve : " + why,
  captures: (number: number) => "Captures : " + number + " images",
  capturedAt: (time: string) => "Capture à " + time,
};
