// 📒 SQL-таблиці обліку в базі закладу (Store на SQLite). Без імпортів — підключається і в store.js, і в ledger.js.
// Таблиці створюються самі при першому зверненні (IF NOT EXISTS). Нова колонка — лише ALTER TABLE ADD у LEDGER_ALTER (старі не чіпати).
// doc   — документи (Ф1): не видаляються; виправлення = сторно. Гроші — цілі копійки (Ф3). day — облікова дата (Ф4).
// audit — журнал змін (Ф6): лише дописування (тригери забороняють UPDATE/DELETE).
// pdlog — журнал доступу до персональних даних (хто дивився РНОКПП, телефони тощо).
export const LEDGER_DDL = [
  `CREATE TABLE IF NOT EXISTS doc (id TEXT PRIMARY KEY, type TEXT NOT NULL, payer TEXT NOT NULL DEFAULT '', day TEXT NOT NULL, no TEXT NOT NULL DEFAULT '',
    st INTEGER NOT NULL DEFAULT 1, sum INTEGER NOT NULL DEFAULT 0, src TEXT NOT NULL DEFAULT '', ext TEXT, who TEXT NOT NULL DEFAULT '',
    ts INTEGER NOT NULL, upd INTEGER NOT NULL DEFAULT 0, rev TEXT, body TEXT NOT NULL DEFAULT '{}')`,
  `CREATE INDEX IF NOT EXISTS doc_day ON doc(day)`,
  `CREATE INDEX IF NOT EXISTS doc_payer_day ON doc(payer, day)`,
  `CREATE INDEX IF NOT EXISTS doc_type_day ON doc(type, day)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS doc_ext ON doc(ext) WHERE ext IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS audit (n INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, who TEXT NOT NULL DEFAULT '', what TEXT NOT NULL, ref TEXT NOT NULL DEFAULT '', was TEXT, now TEXT)`,
  `CREATE INDEX IF NOT EXISTS audit_ref ON audit(ref)`,
  `CREATE INDEX IF NOT EXISTS audit_ts ON audit(ts)`,
  `CREATE TRIGGER IF NOT EXISTS audit_ro_u BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit: лише дописування'); END`,
  `CREATE TRIGGER IF NOT EXISTS audit_ro_d BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit: лише дописування'); END`,
  `CREATE TABLE IF NOT EXISTS pdlog (n INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, who TEXT NOT NULL DEFAULT '', what TEXT NOT NULL, ref TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS pdlog_ts ON pdlog(ts)`,
];
export const LEDGER_TABLES = ['doc', 'audit', 'pdlog'];
