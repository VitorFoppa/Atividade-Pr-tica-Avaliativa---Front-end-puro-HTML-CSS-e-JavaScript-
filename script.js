'use strict';

/* ==========================================================
   AgroRegistro — script.js
   CRUD de aplicações com persistência no localStorage.
   ========================================================== */

const CHAVE_STORAGE = 'agroregistro:aplicacoes';
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const TEXTOS_VAZIO = {
  semRegistros: ['Nenhuma aplicação por aqui', 'Adicione seu primeiro registro no formulário para começar seu histórico de campo.'],
  semResultados: ['Nenhum resultado encontrado', 'Tente outro termo de busca ou altere o período selecionado.'],
};

//formata o numero na região pt-BR. Até 4 numeros.
const formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });

/* ---------- Elementos do DOM ---------- */
const formulario = document.querySelector('#form-aplicacao');
const campoId = document.querySelector('#aplicacao-id');
const campos = {
  talhao: document.querySelector('#talhao'),
  produto: document.querySelector('#produto'),
  dosagem: document.querySelector('#dosagem'),
  unidade: document.querySelector('#unidade'),
  data: document.querySelector('#data-aplicacao'),
  alvo: document.querySelector('#alvo'),
  observacoes: document.querySelector('#observacoes'),
};
const botaoSalvar = document.querySelector('#botao-salvar');
const botaoCancelar = document.querySelector('#botao-cancelar');
const painelFormulario = document.querySelector('.form-panel');
const tituloFormulario = document.querySelector('#form-title');
const rotuloFormulario = painelFormulario.querySelector('.eyebrow');
const simboloFormulario = painelFormulario.querySelector('.heading-symbol');

const listaEl = document.querySelector('#lista-aplicacoes');
const estadoVazio = document.querySelector('#estado-vazio');
const buscaEl = document.querySelector('#busca');
const filtroPeriodo = document.querySelector('#filtro-periodo');
const resumoEl = document.querySelector('#resumo-resultados');
const contadorEl = document.querySelector('#contador-registros');
const feedbackEl = document.querySelector('#mensagem-feedback');

/* ---------- Estado ---------- */
let aplicacoes = []; // array de objetos: fonte única dos dados na tela
let idEmEdicao = null;
let timerFeedback;

/* ---------- Utilitários ---------- */
//permite ao JavaScript verificar uma condição de CSS do navegador. Preferencia do usuario por animações reduzidas no navegador.
const prefereMovimentoReduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

//garante que a string tenha 2 caracteres, se não tem preenche com 0. ex: 2,40.
const doisDigitos = (n) => String(n).padStart(2, '0');

// Data local no formato AAAA-MM-DD (evita o deslocamento de fuso de toISOString)
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

// Ignora acentos, maiúsculas e espaços repetidos (busca e contagem de talhões)
function normalizar(texto) {
  return String(texto)
    //O modo NFD separa muitos caracteres acentuados em duas partes: a letra base e o sinal.
    .normalize('NFD')
    //remove os acentos.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    //Substitui sequências de espaços em branco por apenas um espaço.
    .replace(/\s+/g, ' ')
    .trim();
}

function criarElemento(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto; // textContent evita injeção de HTML
  return el;
}

function mostrarFeedback(texto, tipo = 'sucesso') {
  clearTimeout(timerFeedback);
  feedbackEl.textContent = texto;
  feedbackEl.className = `feedback is-visible is-${tipo}`;
  timerFeedback = setTimeout(() => feedbackEl.classList.remove('is-visible'), 4000);
}

/* ---------- Persistência (localStorage) ---------- */
function registroValido(r) {
  return (
    r && typeof r === 'object' &&
    Number.isFinite(Number(r.id)) &&
    typeof r.talhao === 'string' &&
    typeof r.produto === 'string' &&
    Number.isFinite(Number(r.dosagem)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.data)
  );
}

function carregarAplicacoes() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_STORAGE));
    return Array.isArray(dados) ? dados.filter(registroValido).map((r) => ({ ...r, id: Number(r.id) })) : [];
  } catch (erro) {
    return []; // JSON corrompido ou storage indisponível
  }
}

// Grava a nova lista e só então atualiza a memória, para a tela nunca divergir do que foi salvo
function gravar(novaLista) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(novaLista));
  } catch (erro) {
    mostrarFeedback('Não foi possível salvar neste navegador. Verifique se o armazenamento local está ativo.', 'erro');
    return false;
  }
  aplicacoes = novaLista;
  renderizar();
  return true;
}

/* ---------- CRUD ---------- */
// C — Create
function criarAplicacao(dados) {
  let id = Date.now();
  while (aplicacoes.some((a) => a.id === id)) id += 1; // garante ID único
  return gravar([...aplicacoes, { id, ...dados }]);
}

// U — Update
function atualizarAplicacao(id, dados) {
  return gravar(aplicacoes.map((a) => (a.id === id ? { ...a, ...dados } : a)));
}

// D — Delete
function excluirAplicacao(id) {
  return gravar(aplicacoes.filter((a) => a.id !== id));
}

/* ---------- R — Read: renderização ---------- */
function filtrarAplicacoes() {
  const termo = normalizar(buscaEl.value);
  const mesAtual = hojeISO().slice(0, 7);

  return aplicacoes
    .filter((a) => filtroPeriodo.value !== 'mes' || a.data.startsWith(mesAtual))
    .filter((a) => !termo || normalizar(`${a.talhao} ${a.produto}`).includes(termo))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id); // mais recentes primeiro
}

function criarCartao(a) {
  const [ano, mes, dia] = a.data.split('-');

  const data = criarElemento('time', 'record-date');
  data.dateTime = a.data;
  data.append(
    criarElemento('span', 'record-day', dia), ' ',
    criarElemento('span', 'record-month', MESES[Number(mes) - 1] ?? mes), ' ',
    criarElemento('span', 'record-year', ano),
  );

  const chips = criarElemento('div', 'record-chips');
  chips.appendChild(criarElemento('span', 'chip chip-dose', `${formatoNumero.format(a.dosagem)} ${a.unidade}`));
  if (a.alvo) chips.appendChild(criarElemento('span', 'chip chip-target', `Alvo: ${a.alvo}`));

  const corpo = criarElemento('div', 'record-body');
  corpo.append(criarElemento('h3', 'record-title', a.talhao), criarElemento('p', 'record-product', a.produto), chips);
  if (a.observacoes) corpo.appendChild(criarElemento('p', 'record-notes', a.observacoes));

  const acoes = criarElemento('div', 'record-actions');
  [['editar', 'Editar', 'button-edit'], ['excluir', 'Excluir', 'button-delete']].forEach(([acao, rotulo, classe]) => {
    const botao = criarElemento('button', `button ${classe}`, rotulo);
    botao.type = 'button';
    botao.dataset.acao = acao;
    botao.dataset.id = a.id;
    botao.setAttribute('aria-label', `${rotulo} aplicação de ${a.produto} (${a.talhao})`);
    acoes.appendChild(botao);
  });

  const cartao = criarElemento('article', 'record-card');
  cartao.classList.toggle('is-editing', a.id === idEmEdicao);
  cartao.append(data, corpo, acoes);
  return cartao;
}

function atualizarMetricas() {
  const mesAtual = hojeISO().slice(0, 7);
  const doMes = aplicacoes.filter((a) => a.data.startsWith(mesAtual)).length;
  const talhoes = aplicacoes.reduce((conjunto, a) => conjunto.add(normalizar(a.talhao)), new Set());

  document.querySelector('#total-aplicacoes').textContent = aplicacoes.length;
  document.querySelector('#aplicacoes-mes').textContent = doMes;
  document.querySelector('#total-talhoes').textContent = talhoes.size;
  contadorEl.textContent = aplicacoes.length;
}

function renderizar() {
  const visiveis = filtrarAplicacoes();

  listaEl.innerHTML = '';
  visiveis.forEach((a) => listaEl.appendChild(criarCartao(a)));

  const vazio = visiveis.length === 0;
  estadoVazio.classList.toggle('hidden', !vazio);
  if (vazio) {
    const [titulo, texto] = aplicacoes.length ? TEXTOS_VAZIO.semResultados : TEXTOS_VAZIO.semRegistros;
    estadoVazio.querySelector('h3').textContent = titulo;
    estadoVazio.querySelector('p').textContent = texto;
  }

  resumoEl.textContent = `Mostrando ${visiveis.length} de ${aplicacoes.length} ${aplicacoes.length === 1 ? 'registro' : 'registros'}`;
  atualizarMetricas();
}

/* ---------- Formulário: modo criar / editar ---------- */
function definirModoFormulario(editando) {
  painelFormulario.classList.toggle('is-editing', editando);
  botaoCancelar.classList.toggle('hidden', !editando);
  botaoSalvar.innerHTML = editando
    ? '<span aria-hidden="true">✓</span> Atualizar aplicação'
    : '<span aria-hidden="true">＋</span> Salvar aplicação';
  tituloFormulario.textContent = editando ? 'Editar aplicação' : 'Adicionar aplicação';
  rotuloFormulario.textContent = editando ? 'EDITANDO REGISTRO' : 'NOVO REGISTRO';
  simboloFormulario.textContent = editando ? '✎' : '＋';
}

function lerFormulario() {
  return {
    talhao: campos.talhao.value.trim(),
    produto: campos.produto.value.trim(),
    dosagem: Number(campos.dosagem.value),
    unidade: campos.unidade.value,
    data: campos.data.value,
    alvo: campos.alvo.value.trim(),
    observacoes: campos.observacoes.value.trim(),
  };
}

// U — carrega o item de volta no formulário
function iniciarEdicao(id) {
  const item = aplicacoes.find((a) => a.id === id);
  if (!item) return;

  idEmEdicao = id;
  campoId.value = id;
  campos.talhao.value = item.talhao;
  campos.produto.value = item.produto;
  campos.dosagem.value = item.dosagem;
  campos.unidade.value = [...campos.unidade.options].some((o) => o.value === item.unidade) ? item.unidade : 'Outra';
  campos.data.value = item.data;
  campos.alvo.value = item.alvo || '';
  campos.observacoes.value = item.observacoes || '';

  definirModoFormulario(true);
  renderizar();
  painelFormulario.scrollIntoView({ behavior: prefereMovimentoReduzido() ? 'auto' : 'smooth', block: 'start' });
  campos.talhao.focus({ preventScroll: true });
}

function sairModoEdicao() {
  idEmEdicao = null;
  formulario.reset();
  Object.values(campos).forEach((campo) => campo.setCustomValidity(''));
  campoId.value = '';
  campos.data.value = hojeISO();
  definirModoFormulario(false);
  renderizar();
}

// O atributo required aceita só espaços; aqui o texto é conferido sem eles
function validarTexto(campo) {
  campo.setCustomValidity(campo.value.trim() ? '' : 'Preencha este campo com um texto válido.');
}

function confirmarExclusao(id) {
  const item = aplicacoes.find((a) => a.id === id);
  if (!item) return;

  const confirmado = window.confirm(`Excluir a aplicação de "${item.produto}" em "${item.talhao}"? Esta ação não pode ser desfeita.`);
  if (!confirmado || !excluirAplicacao(id)) return;

  if (idEmEdicao === id) sairModoEdicao();
  mostrarFeedback('Aplicação excluída.');
}

/* ---------- Eventos ---------- */
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();

  [campos.talhao, campos.produto].forEach(validarTexto);
  if (!formulario.reportValidity()) return;

  const editando = campoId.value !== '';
  const dados = lerFormulario();
  const salvou = editando ? atualizarAplicacao(Number(campoId.value), dados) : criarAplicacao(dados);
  if (!salvou) return;

  mostrarFeedback(editando ? 'Aplicação atualizada com sucesso.' : 'Aplicação registrada com sucesso.');
  sairModoEdicao();
});

// Limpa a mensagem personalizada assim que a pessoa volta a digitar
formulario.addEventListener('input', (evento) => evento.target.setCustomValidity?.(''));

botaoCancelar.addEventListener('click', sairModoEdicao);

// Um único listener atende todos os botões Editar/Excluir (delegação de eventos)
listaEl.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;

  const id = Number(botao.dataset.id);
  if (botao.dataset.acao === 'editar') iniciarEdicao(id);
  if (botao.dataset.acao === 'excluir') confirmarExclusao(id);
});

buscaEl.addEventListener('input', renderizar);
filtroPeriodo.addEventListener('change', renderizar);

// Mantém várias abas abertas sincronizadas, para uma aba não sobrescrever os dados da outra
window.addEventListener('storage', (evento) => {
  if (evento.key !== CHAVE_STORAGE) return;
  aplicacoes = carregarAplicacoes();
  renderizar();
});

/* ---------- Clima de hoje (APIs REST via fetch) ----------
   1) ipwho.is (reserva: ipapi.co) -> localização aproximada pelo IP
   2) Open-Meteo                   -> previsão do dia para essa localização
   Nenhuma das duas exige chave de API. */
const CHAVE_CLIMA = 'agroregistro:clima';
const VALIDADE_CLIMA = 30 * 60 * 1000; // 30 min em cache, para poupar as APIs
const CODIGOS_CLIMA = [
  [[0], 'Céu limpo', '☀️'],
  [[1, 2], 'Parcialmente nublado', '🌤️'],
  [[3], 'Nublado', '☁️'],
  [[45, 48], 'Neblina', '🌫️'],
  [[51, 53, 55, 56, 57], 'Garoa', '🌦️'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Chuva', '🌧️'],
  [[71, 73, 75, 77, 85, 86], 'Neve', '❄️'],
  [[95, 96, 99], 'Tempestade', '⛈️'],
];

const climaCard = document.querySelector('#clima');
const climaBotao = document.querySelector('#clima-atualizar');
const climaEl = (nome) => document.querySelector(`#clima-${nome}`);

async function buscarJSON(url) {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

async function obterLocalizacao() {
  try {
    const d = await buscarJSON('https://ipwho.is/');
    if (d.success === false) throw new Error(d.message);
    return { cidade: d.city, estado: d.region, lat: d.latitude, lon: d.longitude };
  } catch (erro) {
    const d = await buscarJSON('https://ipapi.co/json/');
    if (d.error) throw new Error(d.reason);
    return { cidade: d.city, estado: d.region, lat: d.latitude, lon: d.longitude };
  }
}

function obterPrevisao({ lat, lon }) {
  const parametros = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: 1,
  });
  return buscarJSON(`https://api.open-meteo.com/v1/forecast?${parametros}`);
}

function lerCacheClima() {
  try {
    const cache = JSON.parse(localStorage.getItem(CHAVE_CLIMA));
    return cache && Date.now() - cache.quando < VALIDADE_CLIMA ? cache.dados : null;
  } catch (erro) {
    return null;
  }
}

function mostrarClima({ local, previsao }) {
  const atual = previsao.current;
  const dia = previsao.daily;
  const [, descricao, icone] = CODIGOS_CLIMA.find(([codigos]) => codigos.includes(atual.weather_code)) ?? [null, 'Condição indisponível', '🌡️'];
  const graus = (valor) => `${Math.round(valor)}°C`;

  climaEl('local').textContent = [local.cidade, local.estado].filter(Boolean).join(' – ') || 'Local aproximado';
  climaEl('icone').textContent = icone;
  climaEl('temp').textContent = graus(atual.temperature_2m);
  climaEl('desc').textContent = descricao;
  climaEl('minmax').textContent = `${graus(dia.temperature_2m_min[0])} / ${graus(dia.temperature_2m_max[0])}`;
  climaEl('sensacao').textContent = graus(atual.apparent_temperature);
  climaEl('umidade').textContent = `${Math.round(atual.relative_humidity_2m)}%`;
  climaEl('vento').textContent = `${Math.round(atual.wind_speed_10m)} km/h`;
  climaEl('chuva').textContent = `${dia.precipitation_probability_max[0] ?? 0}%`;
}

function mostrarErroClima() {
  climaEl('local').textContent = 'Previsão indisponível';
  climaEl('icone').textContent = '🌡️';
  climaEl('temp').textContent = '--';
  climaEl('desc').textContent = 'Verifique a conexão ou desative bloqueadores de anúncio e tente de novo.';
  ['minmax', 'sensacao', 'umidade', 'vento', 'chuva'].forEach((nome) => (climaEl(nome).textContent = '--'));
}

async function carregarClima(forcar = false) {
  climaCard.classList.add('is-loading');
  climaBotao.disabled = true;

  try {
    let dados = forcar ? null : lerCacheClima();
    if (!dados) {
      const local = await obterLocalizacao();
      dados = { local, previsao: await obterPrevisao(local) };
      try {
        localStorage.setItem(CHAVE_CLIMA, JSON.stringify({ quando: Date.now(), dados }));
      } catch (erro) { /* sem cache, mas a previsão continua sendo exibida */ }
    }
    mostrarClima(dados);
  } catch (erro) {
    mostrarErroClima();
  } finally {
    climaCard.classList.remove('is-loading');
    climaBotao.disabled = false;
  }
}

climaBotao.addEventListener('click', () => carregarClima(true));

/* ---------- Inicialização ---------- */
function iniciar() {
  const hoje = hojeISO();
  campos.data.value = hoje;
  campos.data.max = hoje; // não permite registrar aplicação em data futura. REGRA DE NEGOCIO.

  const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  document.querySelector('#data-atual').textContent = dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1);

  aplicacoes = carregarAplicacoes();
  renderizar();
  carregarClima();
}

iniciar();