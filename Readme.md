# 🌱 AgroRegistro — Diário de Aplicações

Aplicação web para registrar, consultar e organizar as aplicações (tratamentos) realizadas na lavoura. Funciona totalmente no navegador, sem back-end: os dados ficam salvos localmente no `localStorage`.

> Projeto acadêmico da disciplina de **Desenvolvimento Web I**.

[![Deploy no GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-2ea44f?logo=github)](https://vitorfoppa.github.io/Atividade-Pr-tica-Avaliativa---Front-end-puro-HTML-CSS-e-JavaScript-/)
[![Repositório](https://img.shields.io/badge/c%C3%B3digo-GitHub-181717?logo=github)](https://github.com/vitorfoppa/Atividade-Pr-tica-Avaliativa---Front-end-puro-HTML-CSS-e-JavaScript-)
 
🔗 **Acesse o projeto online:** [https://vitorfoppa.github.io/Atividade-Pr-tica-Avaliativa---Front-end-puro-HTML-CSS-e-JavaScript-/](https://vitorfoppa.github.io/Atividade-Pr-tica-Avaliativa---Front-end-puro-HTML-CSS-e-JavaScript-/)

---

## 📋 Sumário

- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Como executar](#-como-executar)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Como usar](#-como-usar)
- [Modelo de dados](#-modelo-de-dados)
- [Regras de negócio e validações](#-regras-de-negócio-e-validações)
- [Clima de hoje (APIs externas)](#-clima-de-hoje-apis-externas)
- [Acessibilidade](#-acessibilidade)
- [Decisões técnicas](#-decisões-técnicas)
- [Limitações conhecidas](#-limitações-conhecidas)

---

## ✨ Funcionalidades

- **CRUD completo** de aplicações: criar, listar, editar e excluir registros.
- **Persistência local** com `localStorage` — os dados permanecem após fechar o navegador.
- **Busca** por talhão ou produto, ignorando acentos, maiúsculas/minúsculas e espaços repetidos.
- **Filtro por período**: todo o histórico ou apenas o mês atual.
- **Painel de métricas**: total de aplicações, aplicações do mês e quantidade de talhões distintos.
- **Ordenação automática**: registros mais recentes primeiro.
- **Modo de edição** no próprio formulário, com botão para cancelar.
- **Confirmação antes de excluir** um registro.
- **Previsão do tempo de hoje** baseada na localização aproximada do usuário, com cache de 30 minutos.
- **Sincronização entre abas**: alterações feitas em uma aba aparecem nas demais.
- **Layout responsivo** para desktop, tablet e celular.

## 🛠 Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 | Estrutura semântica da página |
| CSS3 | Layout (Grid/Flexbox), variáveis CSS e responsividade |
| JavaScript (ES6+) | Lógica, manipulação do DOM, `fetch` e `localStorage` |
| [Open-Meteo](https://open-meteo.com/) | Previsão do tempo (sem chave de API) |
| [ipwho.is](https://ipwho.is/) / [ipapi.co](https://ipapi.co/) | Localização aproximada por IP (sem chave de API) |
| Google Fonts | Bricolage Grotesque e IBM Plex Sans |

Nenhuma biblioteca ou framework é necessário.

## 🚀 Como executar

Não há instalação nem build. Basta ter um navegador moderno.

**Opção 1 — Abrir direto**

1. Baixe ou clone o repositório.
2. Dê dois cliques em `index.html`.

**Opção 2 — Servidor local (recomendado)**

Alguns navegadores restringem chamadas de rede em arquivos abertos via `file://`. Se o clima não carregar, use um servidor local:

```bash
# Python
python -m http.server 8000

# ou Node.js
npx serve .
```

Depois acesse `http://localhost:8000`.

> 🌐 O clima e as fontes dependem de internet. O registro de aplicações funciona normalmente offline.

## 📁 Estrutura do projeto

```
agroregistro/
├── index.html   # Estrutura da página (formulário, lista, métricas e clima)
├── style.css    # Estilos, tema visual e responsividade
├── script.js    # CRUD, filtros, validações e integração com APIs
└── README.md
```

## 🧭 Como usar

1. **Adicionar:** preencha talhão, produto, dosagem, unidade e data, e clique em **Salvar aplicação**. Alvo e observações são opcionais.
2. **Buscar:** digite parte do nome do talhão ou do produto no campo de busca.
3. **Filtrar:** escolha *Todo o histórico* ou *Este mês* no seletor de período.
4. **Editar:** clique em **Editar** no cartão desejado. Os dados voltam ao formulário; altere e clique em **Atualizar aplicação** (ou **Cancelar edição**).
5. **Excluir:** clique em **Excluir** e confirme na janela exibida. A ação não pode ser desfeita.
6. **Clima:** o card no fim da página mostra a previsão do dia; use **Atualizar** para forçar uma nova consulta.

## 🗂 Modelo de dados

Cada aplicação é um objeto JSON salvo no `localStorage` sob a chave `agroregistro:aplicacoes`:

```json
{
  "id": 1735689600000,
  "talhao": "Talhão 04 – Gleba Norte",
  "produto": "Nome comercial do produto",
  "dosagem": 1.5,
  "unidade": "L/ha",
  "data": "2026-10-26",
  "alvo": "Registro do alvo observado",
  "observacoes": "Condições observadas ou outras anotações."
}
```

| Campo | Tipo | Obrigatório | Limite |
|---|---|:---:|---|
| `id` | número | automático | gerado com `Date.now()`, único |
| `talhao` | texto | ✅ | até 80 caracteres |
| `produto` | texto | ✅ | até 100 caracteres |
| `dosagem` | número | ✅ | entre 0,01 e 1.000.000 |
| `unidade` | texto | ✅ | L/ha, mL/ha, kg/ha, g/ha, L/100 L, mL/100 L, g/100 L, kg/100 L ou Outra |
| `data` | `AAAA-MM-DD` | ✅ | não pode ser futura |
| `alvo` | texto | ❌ | até 120 caracteres |
| `observacoes` | texto | ❌ | até 600 caracteres |

O cache do clima é salvo em `agroregistro:clima`.

## ✅ Regras de negócio e validações

- **Não é permitido registrar aplicação com data futura** (o campo de data tem `max` igual ao dia de hoje).
- A **dosagem** deve ser maior que zero.
- **Talhão e produto** não aceitam apenas espaços em branco (validação extra além do `required`).
- Ao carregar, registros do `localStorage` com formato inválido são **descartados** em vez de quebrar a página.
- A contagem de **talhões distintos** ignora acentos, maiúsculas e espaços repetidos (ex.: "Talhão 1" e "talhao  1" contam como um só).
- Datas são tratadas no **fuso local**, evitando o deslocamento de um dia causado por `toISOString()`.

## 🌦 Clima de hoje (APIs externas)

O fluxo é feito com `fetch` e tem timeout de 8 segundos por requisição:

1. **Localização:** consulta `ipwho.is`; se falhar, usa `ipapi.co` como reserva.
2. **Previsão:** envia latitude e longitude para a **Open-Meteo** e recebe temperatura atual, sensação térmica, umidade, vento, código do tempo, mínima, máxima e probabilidade de chuva.
3. **Cache:** o resultado é guardado por 30 minutos para reduzir chamadas às APIs.
4. **Falha:** se as APIs não responderem, o card exibe "Previsão indisponível" e o restante do sistema segue funcionando.

> ⚠️ A localização é **aproximada** (baseada no IP) e pode não corresponder exatamente ao local da lavoura. Bloqueadores de anúncio podem impedir as consultas.

## ♿ Acessibilidade

- HTML semântico (`header`, `main`, `section`, `article`, `footer`) e idioma `pt-BR`.
- Rótulos (`label`) associados a todos os campos do formulário.
- Regiões com `aria-live` para anunciar resultados, feedbacks e clima.
- Botões de ação com `aria-label` descritivo (ex.: "Editar aplicação de X (Talhão Y)").
- Respeito à preferência `prefers-reduced-motion`, desativando a rolagem suave e animações.
- Conteúdo dos registros inserido com `textContent`, evitando injeção de HTML.

## 🧠 Decisões técnicas

- **Fonte única de verdade:** o array `aplicacoes` em memória alimenta toda a interface; a tela é sempre redesenhada a partir dele.
- **Gravar antes de atualizar:** a função `gravar()` salva no `localStorage` primeiro e só depois atualiza o estado, evitando divergência entre tela e dados.
- **Delegação de eventos:** um único listener atende todos os botões Editar/Excluir da lista.
- **Segurança:** elementos criados com `createElement` + `textContent` em vez de `innerHTML` com dados do usuário.
- **Sincronização entre abas** via evento `storage`.

## ⚠️ Limitações conhecidas

- Os dados ficam **apenas no navegador e no dispositivo** em uso; limpar os dados do navegador apaga o histórico.
- Não há exportação/importação nem backup dos registros.
- A localização do clima é por IP, não por GPS.
- Não há autenticação nem suporte a múltiplos usuários.