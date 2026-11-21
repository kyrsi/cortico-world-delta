import type { en } from './strings.ts';

export const S: typeof en = {
  primary: "Principal",
  outputNumber: (number: number) => "Salida de pantalla " + number,
  title: "Observación de Delta",
  status: "Estado",
  source: "Pantalla a observar",
  refresh: "Actualizar estado",
  start: "Iniciar observación",
  pause: "Pausar observación",
  stop: "Detener observación",
  kind: "Evento de prueba",
  simulate: "Activación de prueba sintética",
  testHint: "Prueba la activación con imágenes generadas. Las pruebas sintéticas no confirman eventos del juego.",
  latestEvent: "Último evento",
  noEvents: "Todavía no hay eventos.",
  synthetic: "Prueba sintética",
  previewFull: "Ver imagen completa",
  previewCrop: "Ver recorte",
  fullAlt: "Evidencia completa del evento",
  cropAlt: "Evidencia recortada del evento",
  loading: "Leyendo estado…",
  notLoaded: "La extensión de observación no está cargada.",
  inactive: "La extensión de observación no está activada.",
  missing: "La extensión de observación no está disponible.",
  accepted: "Se aceptó el evento de prueba sintética.",
  rejected: "No se aceptó el evento de prueba sintética.",
  deliveryHint: "Coo decide si responde al evento.",
  kinds: {
    "kill": "Eliminación",
    "knockdown": "Derribo",
    "loot": "Botín de rareza roja"
  },
  combatKinds: {
    self: { kill: "Eliminación (tú)", knockdown: "Derribo (tú)" },
    teammate: { kill: "Eliminación (compañero)", knockdown: "Derribo (compañero)" },
    unknown: { kill: "Eliminación (autoría sin confirmar)", knockdown: "Derribo (autoría sin confirmar)" }
  },
  attributionLabels: { assisted: "Aviso de asistencia", spectating: "Vista de espectador" },
  phases: {
    "unbound": "Sin conexión con la aplicación",
    "stopped": "Detenida",
    "starting": "Iniciando",
    "running": "Observando",
    "blocked": "Observación bloqueada",
    "error": "Error de observación"
  },
  reasons: {
    "unbound": "La extensión de observación no está conectada a la aplicación.",
    "stopped": "La observación está detenida.",
    "paused": "La observación se pausó manualmente.",
    "view-disabled": "La visualización de pantalla está desactivada.",
    "observation-disabled": "La observación del juego está desactivada.",
    "view-permission": "El permiso actual no permite capturas continuas.",
    "core-paused": "Core está pausado.",
    "no-output": "Las burbujas de la mascota no están disponibles.",
    "no-image-model": "El modelo actual no acepta imágenes.",
    "source-unavailable": "La pantalla a observar no está disponible.",
    "worker-failed": "El proceso de observación no puede ejecutarse.",
    "heartbeat-timeout": "El proceso de observación no respondió a tiempo."
  },
  dropReasons: {
    "expired": "El evento venció.",
    "duplicate": "Se ignoró el evento duplicado.",
    "overflow": "Se superó el límite de eventos pendientes.",
    "policy-changed": "Cambió la configuración de visualización.",
    "worker-failed": "El proceso de observación falló.",
    "source-changed": "Cambió la pantalla observada."
  },
  eventStates: {
    "queued": "Pendiente de entrega",
    "delivered": "Añadido a la conversación",
    "dropped": "No entregado"
  },
  stateFailed: (why: string) => "No se pudo leer el estado: " + why,
  previewFailed: (why: string) => "Falló la vista previa de evidencia: " + why,
  captures: (number: number) => "Capturados: " + number + " cuadros",
  capturedAt: (time: string) => "Capturado a las " + time,
};
