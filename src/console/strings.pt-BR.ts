import type { en } from './strings.ts';

export const S: typeof en = {
  primary: "Principal",
  outputNumber: (number: number) => "Saída de vídeo " + number,
  title: "Observação de Delta",
  status: "Estado",
  source: "Tela a observar",
  refresh: "Atualizar estado",
  start: "Iniciar observação",
  pause: "Pausar observação",
  stop: "Parar observação",
  kind: "Evento de teste",
  simulate: "Ativação de teste sintético",
  testHint: "Testa a ativação com imagens geradas. Testes sintéticos não confirmam eventos do jogo.",
  latestEvent: "Último evento",
  noEvents: "Ainda não há eventos.",
  synthetic: "Teste sintético",
  previewFull: "Ver imagem completa",
  previewCrop: "Ver recorte",
  fullAlt: "Evidência completa do evento",
  cropAlt: "Evidência recortada do evento",
  loading: "Lendo o estado…",
  notLoaded: "A extensão de observação não está carregada.",
  inactive: "A extensão de observação não está ativada.",
  missing: "A extensão de observação está indisponível.",
  accepted: "O evento de teste sintético foi aceito.",
  rejected: "O evento de teste sintético não foi aceito.",
  deliveryHint: "Coo decide se responde ao evento.",
  kinds: {
    "kill": "Eliminação",
    "knockdown": "Derrubada",
    "loot": "Espólio de raridade vermelha"
  },
  combatKinds: {
    self: { kill: "Eliminação sua", knockdown: "Derrubada sua" },
    teammate: { kill: "Eliminação por colega de equipe", knockdown: "Derrubada por colega de equipe" },
    unknown: { kill: "Eliminação (autoria não confirmada)", knockdown: "Derrubada (autoria não confirmada)" }
  },
  attributionLabels: { assisted: "Aviso de assistência", spectating: "Visão de espectador" },
  phases: {
    "unbound": "Sem conexão com o aplicativo",
    "stopped": "Parada",
    "starting": "Iniciando",
    "running": "Observando",
    "blocked": "Observação bloqueada",
    "error": "Erro de observação"
  },
  reasons: {
    "unbound": "A extensão de observação não está conectada ao aplicativo.",
    "stopped": "A observação está parada.",
    "paused": "A observação foi pausada manualmente.",
    "view-disabled": "A visualização da tela está desativada.",
    "observation-disabled": "A observação do jogo está desativada.",
    "view-permission": "A permissão atual não permite capturas contínuas.",
    "core-paused": "Core está pausado.",
    "no-output": "Os balões do pet estão indisponíveis.",
    "no-image-model": "O modelo atual não aceita imagens.",
    "source-unavailable": "A tela a observar está indisponível.",
    "worker-failed": "O processo de observação não pode ser executado.",
    "heartbeat-timeout": "O processo de observação não respondeu a tempo."
  },
  dropReasons: {
    "expired": "O evento expirou.",
    "duplicate": "O evento duplicado foi ignorado.",
    "overflow": "O limite de eventos pendentes foi excedido.",
    "policy-changed": "As configurações de visualização mudaram.",
    "worker-failed": "O processo de observação falhou.",
    "source-changed": "A tela observada mudou."
  },
  eventStates: {
    "queued": "Aguardando entrega",
    "delivered": "Adicionado à conversa",
    "dropped": "Não entregue"
  },
  stateFailed: (why: string) => "Não foi possível ler o estado: " + why,
  previewFailed: (why: string) => "Falha na prévia da evidência: " + why,
  captures: (number: number) => "Capturados: " + number + " quadros",
  capturedAt: (time: string) => "Capturado em " + time,
};
