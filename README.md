# Qualidade Documental (Cloudflare 100% grátis)

Sistema para **visualização de indicadores de qualidade** com upload de Excel (não salva o arquivo), cards, lista de analistas, filtros e **salvamento de listas (snapshots)**.

- Frontend: **Cloudflare Pages** (Vite + React)
- Backend: **Cloudflare Workers** (Hono)
- Banco: **Cloudflare D1 (SQLite)** — armazena só os *dados normalizados e snapshots*, nunca a planilha.

## O que o sistema faz
1. Você faz upload do Excel (aba `Relatorio`).
2. O navegador lê o arquivo (SheetJS) e envia apenas os campos necessários (linhas normalizadas) para o Worker.
3. O Worker grava no D1 e gera os indicadores.
4. A tela mostra:
   - Cards (qualidade média, total, aptos HO, alerta, presencial)
   - Tabela com todos os analistas
   - Filtros (data, ADE, analista, esteira/grupo, severidade, peso/pontos)
   - Exportar lista (CSV/JSON)
   - Salvar “snapshot” (lista filtrada + indicadores) para consultar depois

## Regras de pontuação (padrão)
- `CONFERE` => 100 pontos
- `NÃO CONFERE` + severidade:
  - LEVE => 98
  - MÉDIO => 95
  - GRAVE => 90
  - GRAVÍSSIMO => 80

Você pode ajustar no arquivo `apps/worker/src/scoring.ts`.

## Regras de Home Office (padrão)
- Mantém HO: **qualidade >= 90** e **posição de produção <= 25**
- Alerta: qualidade 88–89
- Retorno ao presencial: **2 meses consecutivos** com qualidade < 88 **ou** posição > 30

A regra está em `apps/worker/src/ho.ts`.

> Produção (ranking) pode ser calculada por volume de análises no período filtrado.

---

# Como publicar (passo a passo)

## 0) Pré-requisitos
- Node 18+
- Conta Cloudflare
- `npm i -g wrangler`

## 1) Instalar dependências
Na raiz do projeto:
```bash
npm install
```

## 2) Criar D1 e aplicar schema
```bash
cd apps/worker
wrangler d1 create qualidade_documental
# copie o database_id retornado e cole no wrangler.toml

wrangler d1 execute qualidade_documental --file=./schema.sql
```

## 3) Rodar local
Em 2 terminais:

**Worker**
```bash
cd apps/worker
npm run dev
```

**Web**
```bash
cd apps/web
npm run dev
```

A web chama o worker via `VITE_API_BASE`. Em local, ela aponta para `http://127.0.0.1:8787`.

## 4) Deploy
**Worker**
```bash
cd apps/worker
npm run deploy
```

**Pages**
- Conecte o repositório no Cloudflare Pages
- Build command: `cd apps/web && npm install && npm run build`
- Output: `apps/web/dist`
- Variável de ambiente: `VITE_API_BASE` = URL do seu Worker

---

# Formato esperado do Excel (aba `Relatorio`)
O sistema foi feito para o modelo igual ao seu:
- `Status Atendimento` (CONFERE / NÃO CONFERE)
- `Operador` (analista)
- `Adesão` (ADE)
- `Grupo` (esteira)
- `Data`
- `Manifesto` (motivo)
- `SEVERIDADE` (LEVE/GRAVE/GRAVISSIMO/MEDIO)

Se os títulos tiverem espaços, o sistema remove automaticamente.
