# Resolvendo bloqueio do Cloudflare

A Epic Games protege sua API GraphQL com Cloudflare, o que pode bloquear requisições de aplicações.

## Soluções (em ordem de recomendação):

### 1. **Reautenticar no Legendary** (Solução Mais Simples)
Seu token pode estar expirado ou corrompido. Execute:

```bash
legendary auth
```

Depois reinicie a aplicação.

### 2. **Usar um Proxy** (Solução Recomendada)
Se você está em uma rede corporativa ou com restrições:

```bash
# Windows (Command Prompt)
set EPIC_GRAPHQL_PROXY=http://seu-proxy:porta
npm run tauri dev

# Windows (PowerShell)
$env:EPIC_GRAPHQL_PROXY="http://seu-proxy:porta"
npm run tauri dev

# Linux/Mac
export EPIC_GRAPHQL_PROXY=http://seu-proxy:porta
npm run tauri dev
```

### 3. **Ativar Debug Mode**
Para ver os detalhes exatos do erro:

```bash
# Windows (Command Prompt)
set EPIC_GRAPHQL_DEBUG=1
npm run tauri dev

# Windows (PowerShell)
$env:EPIC_GRAPHQL_DEBUG="1"
npm run tauri dev

# Linux/Mac
export EPIC_GRAPHQL_DEBUG=1
npm run tauri dev
```

### 4. **Usar Proxy Público (Risco de Segurança)**
Se nada acima funcionar, você pode tentar serviços de proxy gratuitos (NÃO RECOMENDADO para produção):

- https://www.freeproxylists.net/
- https://www.proxy-list.download/

```bash
set EPIC_GRAPHQL_PROXY=http://proxy-ip:porta
npm run tauri dev
```

## O que foi implementado:

✅ Cookie store ativado para manter sessão  
✅ Compressão (gzip, deflate, brotli)  
✅ Headers realistas (sec-ch-ua, sec-fetch, etc)  
✅ Retry automático com backoff exponencial  
✅ Suporte a proxy

## Causas comuns:

- ❌ Token expirado → Execute `legendary auth`
- ❌ Rede bloqueada → Use proxy
- ❌ Mudança de IP → Aguarde ou use proxy
- ❌ Rate limit → A aplicação faz retry automaticamente

Se nenhuma solução funcionar, verifique se o Legendary CLI funciona:

```bash
legendary list-games --json
```

Se isso também falhar, o problema é com sua conta/rede, não com a aplicação.
