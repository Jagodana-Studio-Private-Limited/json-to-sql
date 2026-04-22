"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, RefreshCw, Database, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToolEvents } from "@/lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

type SqlDialect = "mysql" | "postgresql" | "sqlite";

interface ConversionOptions {
  dialect: SqlDialect;
  tableName: string;
  includeCreateTable: boolean;
  includeInsert: boolean;
  useUpsert: boolean;
  batchInsert: boolean;
}

// ─── SQL type inference ────────────────────────────────────────────────────────

function inferSqlType(value: unknown, dialect: SqlDialect): string {
  if (value === null || value === undefined) {
    return "TEXT";
  }
  if (typeof value === "boolean") {
    if (dialect === "mysql") return "TINYINT(1)";
    return "BOOLEAN";
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) return "INT";
    return "REAL";
  }
  if (typeof value === "string") {
    return "TEXT";
  }
  // objects / arrays → serialise as JSON string
  return "TEXT";
}

// ─── Quoting helpers ──────────────────────────────────────────────────────────

function quoteIdentifier(name: string, dialect: SqlDialect): string {
  if (dialect === "mysql") return "`" + name.replace(/`/g, "``") + "`";
  return '"' + name.replace(/"/g, '""') + '"';
}

function quoteValue(value: unknown, dialect: SqlDialect): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") {
    if (dialect === "mysql") return value ? "1" : "0";
    return value ? "TRUE" : "FALSE";
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }
  // nested object/array → JSON string
  const json = JSON.stringify(value).replace(/'/g, "''");
  return `'${json}'`;
}

// ─── Core conversion ──────────────────────────────────────────────────────────

function convertToSql(
  rows: Record<string, unknown>[],
  opts: ConversionOptions
): string {
  const { dialect, tableName, includeCreateTable, includeInsert, useUpsert, batchInsert } = opts;

  // Collect all unique keys (columns) across all rows
  const columnSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columnSet.add(key);
    }
  }
  const columns = Array.from(columnSet);

  const parts: string[] = [];

  // ── CREATE TABLE ────────────────────────────────────────────────────────────
  if (includeCreateTable) {
    const tableLiteral = quoteIdentifier(tableName, dialect);

    const colDefs = columns.map((col) => {
      // Use the first non-null value to determine type
      let sampleValue: unknown = null;
      for (const row of rows) {
        if (row[col] !== null && row[col] !== undefined) {
          sampleValue = row[col];
          break;
        }
      }
      const sqlType = inferSqlType(sampleValue, dialect);
      return `  ${quoteIdentifier(col, dialect)} ${sqlType}`;
    });

    let createStmt: string;
    if (dialect === "postgresql") {
      createStmt =
        `CREATE TABLE IF NOT EXISTS ${tableLiteral} (\n${colDefs.join(",\n")}\n);`;
    } else if (dialect === "sqlite") {
      createStmt =
        `CREATE TABLE IF NOT EXISTS ${tableLiteral} (\n${colDefs.join(",\n")}\n);`;
    } else {
      // mysql
      createStmt =
        `CREATE TABLE IF NOT EXISTS ${tableLiteral} (\n${colDefs.join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
    }

    parts.push(createStmt);
  }

  // ── INSERT / UPSERT ─────────────────────────────────────────────────────────
  if (includeInsert && rows.length > 0) {
    const tableLiteral = quoteIdentifier(tableName, dialect);
    const colList = columns.map((c) => quoteIdentifier(c, dialect)).join(", ");

    // Build VALUES rows
    const valueRows = rows.map((row) => {
      const vals = columns.map((col) => quoteValue(row[col] ?? null, dialect));
      return `  (${vals.join(", ")})`;
    });

    if (batchInsert) {
      // Single multi-row INSERT
      let stmt: string;
      if (useUpsert) {
        stmt = buildUpsert(tableLiteral, colList, valueRows.join(",\n"), columns, dialect);
      } else {
        stmt = `INSERT INTO ${tableLiteral} (${colList})\nVALUES\n${valueRows.join(",\n")};`;
      }
      parts.push(stmt);
    } else {
      // Individual INSERT per row
      const stmts = valueRows.map((valRow) => {
        if (useUpsert) {
          return buildUpsert(tableLiteral, colList, valRow, columns, dialect);
        }
        return `INSERT INTO ${tableLiteral} (${colList})\nVALUES\n${valRow};`;
      });
      parts.push(stmts.join("\n"));
    }
  }

  return parts.join("\n\n");
}

function buildUpsert(
  tableLiteral: string,
  colList: string,
  valueRows: string,
  columns: string[],
  dialect: SqlDialect
): string {
  if (dialect === "mysql") {
    // INSERT ... ON DUPLICATE KEY UPDATE
    const updates = columns
      .map((c) => {
        const q = quoteIdentifier(c, "mysql");
        return `${q} = VALUES(${q})`;
      })
      .join(",\n    ");
    return `INSERT INTO ${tableLiteral} (${colList})\nVALUES\n${valueRows}\nON DUPLICATE KEY UPDATE\n    ${updates};`;
  } else if (dialect === "postgresql") {
    const updates = columns
      .map((c) => {
        const q = quoteIdentifier(c, "postgresql");
        return `${q} = EXCLUDED.${q}`;
      })
      .join(",\n    ");
    return `INSERT INTO ${tableLiteral} (${colList})\nVALUES\n${valueRows}\nON CONFLICT DO UPDATE SET\n    ${updates};`;
  } else {
    // sqlite
    return `INSERT OR REPLACE INTO ${tableLiteral} (${colList})\nVALUES\n${valueRows};`;
  }
}

// ─── Default sample JSON ──────────────────────────────────────────────────────

const SAMPLE_JSON = `[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "age": 29,
    "is_active": true,
    "score": 98.5,
    "created_at": "2024-01-15"
  },
  {
    "id": 2,
    "name": "Bob Smith",
    "email": "bob@example.com",
    "age": 34,
    "is_active": false,
    "score": 72.0,
    "created_at": "2024-03-22"
  },
  {
    "id": 3,
    "name": "Carol White",
    "email": "carol@example.com",
    "age": 41,
    "is_active": true,
    "score": 85.25,
    "created_at": "2024-06-10"
  }
]`;

// ─── Component ────────────────────────────────────────────────────────────────

const DIALECT_LABELS: Record<SqlDialect, string> = {
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  sqlite: "SQLite",
};

export function JsonToSqlTool() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [sqlOutput, setSqlOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [opts, setOpts] = useState<ConversionOptions>({
    dialect: "postgresql",
    tableName: "my_table",
    includeCreateTable: true,
    includeInsert: true,
    useUpsert: false,
    batchInsert: true,
  });

  // ── Conversion ────────────────────────────────────────────────────────────

  const convert = useCallback(
    (input: string, options: ConversionOptions) => {
      setError(null);
      if (!input.trim()) {
        setSqlOutput("");
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(input);
      } catch {
        setError("Invalid JSON — please check your input.");
        setSqlOutput("");
        return;
      }

      // Normalise to array of records
      let rows: Record<string, unknown>[];
      if (Array.isArray(parsed)) {
        rows = parsed.map((item, i) => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) {
            throw new Error(`Item at index ${i} is not an object.`);
          }
          return item as Record<string, unknown>;
        });
      } else if (typeof parsed === "object" && parsed !== null) {
        rows = [parsed as Record<string, unknown>];
      } else {
        setError("JSON must be an object or an array of objects.");
        setSqlOutput("");
        return;
      }

      if (rows.length === 0) {
        setError("The JSON array is empty — nothing to convert.");
        setSqlOutput("");
        return;
      }

      try {
        const sql = convertToSql(rows, options);
        setSqlOutput(sql);
        ToolEvents.toolUsed("convert");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Conversion failed.");
        setSqlOutput("");
      }
    },
    []
  );

  // Auto-convert on mount with sample data
  useEffect(() => {
    convert(SAMPLE_JSON, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-convert when options change
  const handleOptionChange = <K extends keyof ConversionOptions>(
    key: K,
    value: ConversionOptions[K]
  ) => {
    const newOpts = { ...opts, [key]: value };
    setOpts(newOpts);
    convert(jsonInput, newOpts);
  };

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    convert(value, opts);
  };

  const handleCopy = async () => {
    if (!sqlOutput) return;
    await navigator.clipboard.writeText(sqlOutput);
    setCopied(true);
    toast.success("SQL copied to clipboard!");
    ToolEvents.resultCopied();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setJsonInput(SAMPLE_JSON);
    convert(SAMPLE_JSON, opts);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Options Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/50">
        {/* Dialect */}
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium">Dialect:</span>
          <div className="relative">
            <select
              value={opts.dialect}
              onChange={(e) =>
                handleOptionChange("dialect", e.target.value as SqlDialect)
              }
              className="appearance-none rounded-lg border border-border/60 bg-background pl-3 pr-8 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer"
            >
              {(Object.keys(DIALECT_LABELS) as SqlDialect[]).map((d) => (
                <option key={d} value={d}>
                  {DIALECT_LABELS[d]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none text-muted-foreground" />
          </div>
        </div>

        {/* Table name */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Table:</span>
          <input
            type="text"
            value={opts.tableName}
            onChange={(e) => handleOptionChange("tableName", e.target.value || "my_table")}
            placeholder="table_name"
            className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm">
            <input
              type="checkbox"
              checked={opts.includeCreateTable}
              onChange={(e) => handleOptionChange("includeCreateTable", e.target.checked)}
              className="rounded accent-blue-500"
            />
            CREATE TABLE
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm">
            <input
              type="checkbox"
              checked={opts.includeInsert}
              onChange={(e) => handleOptionChange("includeInsert", e.target.checked)}
              className="rounded accent-blue-500"
            />
            INSERT
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm">
            <input
              type="checkbox"
              checked={opts.useUpsert}
              onChange={(e) => handleOptionChange("useUpsert", e.target.checked)}
              className="rounded accent-blue-500"
            />
            UPSERT
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm">
            <input
              type="checkbox"
              checked={opts.batchInsert}
              onChange={(e) => handleOptionChange("batchInsert", e.target.checked)}
              className="rounded accent-blue-500"
            />
            Batch INSERT
          </label>
        </div>
      </div>

      {/* Split panels */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* JSON Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              JSON Input
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Reset sample
            </Button>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => handleJsonChange(e.target.value)}
            spellCheck={false}
            placeholder='Paste JSON here… e.g. [{"id":1,"name":"Alice"}]'
            className="font-mono text-sm rounded-xl border border-border/50 bg-muted/20 p-4 resize-none h-96 focus:outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted-foreground/50"
          />
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* SQL Output */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              SQL Output
            </span>
            <Button
              size="sm"
              onClick={handleCopy}
              disabled={!sqlOutput}
              className="h-7 gap-1.5 text-xs bg-gradient-to-r from-brand to-brand-accent text-white shadow-sm shadow-brand/20"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>
          <textarea
            value={sqlOutput}
            readOnly
            spellCheck={false}
            placeholder="Your SQL will appear here…"
            className="font-mono text-sm rounded-xl border border-border/50 bg-muted/20 p-4 resize-none h-96 focus:outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-muted-foreground/50"
          />
          {sqlOutput && (
            <p className="text-xs text-muted-foreground text-right">
              {sqlOutput.split("\n").length} lines · {sqlOutput.length} chars
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
