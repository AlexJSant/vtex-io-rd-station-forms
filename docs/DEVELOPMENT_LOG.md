# Development Log

## Estado atual (após correções de ambiente e build)

- **`react/yarn.lock` regenerado:** o arquivo anterior estava corrompido (conteúdo efetivamente composto por bytes nulos, ~226 KB). O Yarn 1 usado pelo `vtex link` falhava ao parsear com erro do tipo `Unknown token: { line: 1, col: 0, type: 'INVALID', value: undefined }` referenciando `react/yarn.lock`.
- **Ponto de entrada único no pacote React:** removido `react/index.ts` duplicado; mantido apenas `react/index.tsx`. O builder VTEX (`vtex.builder-hub`) não aceita dois entrypoints `index.ts` e `index.tsx` simultâneos — mensagem: *You can not have both index.tsx and index.ts entrypoints*.
- Os dois arquivos de índice eram **iguais** (mesmos re-exports de `./RDStationForm` e `./loadRdStationScript`); a remoção não altera as exportações públicas do módulo.

## Detalhes — falha do Yarn no `vtex link`

- Comando observado: `vtex link` → *Running yarn in react* → `yarn install` (Yarn **v1.22.10** via toolbelt) → falha no lockfile.
- **Causa raiz:** `yarn.lock` não era um lockfile válido (início do arquivo sem cabeçalho Yarn v1; inspeção mostrou arquivo preenchido com `\0`).
- **Correção aplicada:**
  1. Exclusão do `react/yarn.lock` inválido.
  2. Regeneração com Yarn 1, por exemplo: `npx yarn@1.22.19 install --non-interactive --ignore-engines` na pasta `react/` (alinhado às flags usadas pelo fluxo VTEX).
- **Observação:** durante o `yarn install`, apareceu aviso sobre `package-lock.json` coexistindo com Yarn — para evitar lockfiles mistos, avaliar manter apenas `yarn.lock` no app `react/` se o fluxo oficial for Yarn.

## Detalhes — falha de build no Builder Hub

- App observado no log: `sunhouse.rd-station-forms@0.1.0` (workspace/conta conforme ambiente).
- **Erro bloqueante:** *App build failed with message: You can not have both index.tsx and index.ts entrypoints*.
- **Correção:** manter somente `react/index.tsx` como barrel/entrypoint; `react/index.ts` removido.

## Avisos do build (não resolvidos nesta sessão)

- **GraphQL:** *Failed to generate graphql operation types* (`vtex.builder-hub`) — tratado como aviso no log; investigar apenas se o app depender de tipos gerados a partir de operações GraphQL.

---

## App VTEX IO — RD Station Forms (entrega e arquitetura)

Objetivo: bloco **Store Framework** reutilizável para incorporar formulários **RD Station** no DOM da loja (sem iframe, sem `dangerouslySetInnerHTML`, sem sandbox, sem scripts inline no JSX).

### Stack e padrões

- React + TypeScript, VTEX IO `react` builder 3.x, `store` builder, **CSS Modules** (`react/styles.css` com classes `container`, `title`, `formWrapper` e seletores `:global` para inputs/botões injetados pela RD).
- **Não** foram usados **CSS handles** (`vtex.css-handles`); estilização adicional via `className` no bloco e atributo estável `data-rd-station-form-wrapper` no `<section>` raiz.

### Arquivos principais

| Área | Arquivo | Função |
|------|---------|--------|
| Componente | `react/RDStationForm.tsx` | Carrega script RD uma vez (via módulo dedicado), monta `<div id={formId} role="main">`, chama `new window.RDStationForms(anchorId, identifier ?? '').createForm()`, loading/erro/`onSuccess`, schema para Site Editor, `defaultProps`. |
| Script | `react/loadRdStationScript.ts` | URL estável `rdstation-forms.min.js`, reuso de `<script>` já no DOM, `window.__rdStationFormsScriptPromise`, retry após falha (limpa a promise global). |
| Tipos | `react/typings/rdstation-forms.d.ts` | `Window.RDStationForms` e promise global tipadas. |
| Estilos | `react/styles.css` | Módulo; `:global` para filhos gerados pela RD. |
| Export | `react/index.tsx` | barrel (único entrypoint; não usar `index.ts` em paralelo). |
| Loja | `store/interfaces.json` | Bloco `rd-station-form` → componente `RDStationForm`. |
| Manifest | `manifest.json` | App `sunhouse.rd-station-forms@0.1.0` (ajustar `vendor` à conta). |

### Comportamento implementado

- Carregamento assíncrono do script com verificação de tag existente e proteção contra duplicação.
- Múltiplas instâncias na mesma página: contagem por `formId` (anchor) com `Map` para Strict Mode; aviso em console se `formId` duplicado.
- Cleanup no unmount: limpa filhos do container; compatível com navegação SPA da VTEX.
- Estados opcionais: `showLoading`, `loadingLabel`, `errorFallbackLabel`; `onSuccess` reservado para evolução (não exposto no schema JSON).

---

## Integração RD — CORS e ambientes

### Sintoma observado

- Erro de **CORS** ao acessar `https://forms.rdstation.com.br/...` a partir da origem da loja (`https://dev1--…myvtex.com` ou domínio publicado).
- Stack: `rdstation-forms.min.js` → `getTemplateData` / `createForm` → fetch/XHR para o domínio RD; Service Worker (Workbox `NetworkOnly`) pode surfar o problema como `no-response`, mas a **causa** é política cross-origin + cabeçalhos da resposta.

### Aprendizados documentados

- CORS depende dos **cabeçalhos de resposta** de `forms.rdstation.com.br` (ex.: `Access-Control-Allow-Origin`). O **login de admin** não altera a **origem** da vitrine; o que difere é **workspace dev** (`*.myvtex.com`) vs **domínio publicado** — são origens diferentes para o navegador.
- Placeholder da documentação RD (`my-form-aeiou…`) pode retornar **404** e ainda assim ilustrar bloqueio; validar sempre com **ID real** do painel RD.
- Inspeção: aba **Rede** no DevTools (cabeçalhos de resposta) ou `curl -sSIL` / `curl` com `-H "Origin: …"` (curl não aplica CORS do browser, mas mostra o que o servidor envia).

### Ação recomendada fora do código

- Confirmar com **RD Station** suporte à origem VTEX (`*.myvtex.com` + produção) para a API usada pelo script integrado, ou uso oficial alternativo (trade-offs conhecidos: iframe contorna parte do problema por outra origem no iframe).

---

## Ajustes de produto (UX / CMS)

### Remoção do título local (`<h2>`)

- **Motivo:** o formulário RD já traz títulos; evitar duplicar heading na vitrine.
- **Implementação:** renderização do `title` **desativada**; trechos **comentados** para reativação futura: prop `title` na interface, JSX com `<h2 className={styles.title}>`, entrada em `defaultProps`, bloco correspondente no `RDStationForm.schema.properties`.
- A classe `.title` em `styles.css` permanece para uso quando o JSX for descomentado.

### Referência — props do bloco (`blocks.json` / Site Editor)

Props aceitas pelo componente (schema reflete o que o Site Editor lista, exceto onde anotado):

| Prop | Observação |
|------|--------------|
| `formId` | Obrigatório na prática — id do embed RD (primeiro argumento / `id` do elemento). |
| `identifier` | Opcional — segundo argumento (`UA-…` ou vazio conforme snippet RD). |
| `className` | Opcional — classes no wrapper; típico no JSON do tema. |
| `showLoading` | Opcional — default `true`; `false` oculta o texto de carregamento. |
| `loadingLabel` | Opcional — texto de loading. |
| `errorFallbackLabel` | Opcional — mensagem de erro amigável. |
| `onSuccess` | Apenas uso programático — **não** está no schema (não configurável no CMS como função). |
| `title` | **Desativada** — comentada no código; não usar no JSON até reativar implementação. |

---

## Referência rápida — arquivos tocados (histórico agregado)

| Arquivo / área | Ação |
|----------------|------|
| `react/yarn.lock` | Substituído (regenerado após remoção do arquivo corrompido) |
| `react/index.ts` | Removido (duplicata de `index.tsx`; builder não aceita ambos) |
| `react/index.tsx` | Mantido como único entrypoint barrel |
| `react/RDStationForm.tsx` | Componente + schema + ajuste `title` comentado |
| `react/loadRdStationScript.ts` | Loader único do script RD |
| `react/styles.css` | CSS Modules + `:global` |
| `react/typings/rdstation-forms.d.ts` | Tipagem `window.RDStationForms` |
| `store/interfaces.json` | Bloco `rd-station-form` |
| `manifest.json` | Metadados do app |

## Follow-ups sugeridos

- Confirmar política de lockfile no repositório (`yarn.lock` vs `package-lock.json` na pasta `react/`).
- Se o aviso de GraphQL persistir e for relevante, revisar configuração de operações/schemas esperados pelo Builder Hub.
- Após mudanças, validar novamente `vtex link` e o build remoto do app.
- RD Station: confirmar CORS/domínios permitidos para `forms.rdstation.com.br` nas origens VTEX (dev e produção).
- Opcional futuro: expor **CSS handles** (`vtex.css-handles`) se o tema precisar de classes estáveis sem depender de hashes de CSS Modules.
