-- Linhas normalizadas (sem salvar Excel)
CREATE TABLE IF NOT EXISTS qa_rows (
  id TEXT PRIMARY KEY,
  imported_at TEXT NOT NULL,
  import_label TEXT NOT NULL,

  data TEXT,
  adesao TEXT,
  operador TEXT,
  grupo TEXT,
  status TEXT,
  manifesto TEXT,
  severidade TEXT,
  pontos INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rows_data ON qa_rows(data);
CREATE INDEX IF NOT EXISTS idx_rows_operador ON qa_rows(operador);
CREATE INDEX IF NOT EXISTS idx_rows_grupo ON qa_rows(grupo);
CREATE INDEX IF NOT EXISTS idx_rows_adesao ON qa_rows(adesao);
CREATE INDEX IF NOT EXISTS idx_rows_severidade ON qa_rows(severidade);
CREATE INDEX IF NOT EXISTS idx_rows_pontos ON qa_rows(pontos);

-- Snapshots: salva filtros + dashboard materializado (pra abrir rápido)
CREATE TABLE IF NOT EXISTS qa_snapshots (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  dashboard_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_created ON qa_snapshots(created_at);
