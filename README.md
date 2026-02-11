# Epic Light Launcher (Omega Launcher)

Launcher desktop feito com **Tauri + React + TypeScript** para consumir dados da conta Epic via **Legendary CLI** e exibir recursos da Epic Store (destaques, jogos gratis, promocoes e busca de catalogo).

## Proposito do projeto

O projeto existe para oferecer uma experiencia leve e centralizada para:

- visualizar a biblioteca da Epic (com paginacao e busca);
- consultar detalhes de jogos;
- ver perfil, wishlist e amigos;
- acompanhar jogos gratis e promocoes da Epic Store;
- configurar cookie e user-agent para contornar bloqueios de acesso do GraphQL da Store.

## Stack

- Frontend: React 19, React Router, Vite, TypeScript, TailwindCSS
- Desktop/runtime: Tauri v2 (Rust)
- Integracoes:
  - `src-tauri/bin/legendary.exe` (Legendary CLI)
  - APIs Epic GraphQL e Epic Store

## Pre-requisitos

### 1) Node.js e npm

- Node.js 20+ recomendado
- npm 10+ recomendado

### 2) Rust (para Tauri)

- Rust toolchain (via `rustup`)
- Cargo (instalado com Rust)

### 3) Dependencias de build no Windows

Como o projeto usa Tauri, tenha instalado o ambiente de compilacao C++ do Visual Studio Build Tools.

### 4) Legendary

Este repositorio ja inclui o binario em `src-tauri/bin/legendary.exe` (foco em Windows).

## Como clonar o projeto

```bash
git clone <URL_DO_REPOSITORIO> epic-light-launcher
cd epic-light-launcher
```

## Instalacao de pacotes

```bash
npm install
```

Isso instala as dependencias do frontend e a CLI do Tauri definida no `package.json`.

## Comandos principais

### Rodar app desktop (recomendado)

```bash
npm run tauri dev
```

- Sobe o Vite na porta `1420` e abre o app Tauri.
- Este e o fluxo correto para testar tudo que depende de comandos nativos (`invoke`/Rust/Legendary).

### Rodar somente frontend (sem shell nativo do Tauri)

```bash
npm run dev
```

- Inicia apenas o Vite.
- Recursos que dependem de comandos Tauri podem nao funcionar nesse modo.

### Build do frontend

```bash
npm run build
```

### Preview da build web

```bash
npm run preview
```

### Gerar build desktop (instalador/binario)

```bash
npm run tauri build
```

## Primeiro uso (autenticacao Epic)

Para carregar biblioteca e dados da conta, autentique o Legendary:

```powershell
.\src-tauri\bin\legendary.exe auth
```

Depois rode:

```bash
npm run tauri dev
```

Se a sessao expirar, a tela de biblioteca permite reautenticar.

## Configuracao da Epic Store (cookie e user-agent)

Alguns endpoints da Epic Store podem ser bloqueados por Cloudflare. O app possui tela **Settings** para salvar:

- Cookie completo da request para `https://store.epicgames.com/graphql`
- User-Agent usado nessa mesma request

Arquivos locais usados pelo app:

- Cookie: `%AppData%/epic-light-launcher/store_cookie.txt`
- User-Agent: `%AppData%/epic-light-launcher/store_user_agent.txt`

## Variaveis de ambiente uteis

- `EPIC_GRAPHQL_PROXY`: proxy para chamadas GraphQL da conta
- `EPIC_STORE_PROXY`: proxy para chamadas da Store
- `EPIC_GRAPHQL_DEBUG=1`: logs detalhados do GraphQL
- `EPIC_STORE_DEBUG=1`: logs detalhados da Store
- `EPIC_STORE_COOKIE`: cookie da Store direto por env
- `EPIC_STORE_COOKIE_FILE`: caminho customizado para arquivo de cookie
- `EPIC_USER_AGENT`: sobrescreve user-agent padrao

Exemplo no PowerShell:

```powershell
$env:EPIC_GRAPHQL_PROXY="http://seu-proxy:porta"
npm run tauri dev
```

## Estrutura resumida

```text
epic-light-launcher/
  src/                 # React app (pages, components, services)
  src-tauri/           # Backend Tauri em Rust
    src/legendary.rs   # Integracao com Legendary CLI
    src/epic_store.rs  # Integracao com Epic Store GraphQL/freebies
    src/epic_graphql.rs# Perfil, wishlist e amigos via GraphQL
    bin/legendary.exe  # Binario do Legendary usado no app
```

## Troubleshooting rapido

### Biblioteca nao carrega / erro 403

1. Reautentique o Legendary:
   ```powershell
   .\src-tauri\bin\legendary.exe auth
   ```
2. Reinicie o app.

### Wishlist/Amigos vazios ou Store bloqueada

1. Configure Cookie e User-Agent na tela **Settings**.
2. Teste com proxy (`EPIC_GRAPHQL_PROXY` / `EPIC_STORE_PROXY`) se sua rede bloquear.
3. Ative debug:
   ```powershell
   $env:EPIC_GRAPHQL_DEBUG="1"
   $env:EPIC_STORE_DEBUG="1"
   npm run tauri dev
   ```

## Observacoes

- O projeto esta preparado principalmente para Windows (usa `legendary.exe` no repositorio).
- Em modo `tauri dev`, o Vite usa porta fixa `1420` (`strictPort` ativado).
