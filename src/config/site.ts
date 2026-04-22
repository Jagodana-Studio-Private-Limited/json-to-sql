export const siteConfig = {
  // ====== CUSTOMIZE THESE FOR EACH TOOL ======
  name: "JSON to SQL",
  title: "JSON to SQL Converter — Free Online JSON to SQL INSERT Generator",
  description:
    "Convert JSON objects and arrays to SQL INSERT, CREATE TABLE, or UPSERT statements instantly. Supports MySQL, PostgreSQL, and SQLite. 100% free, no login required.",
  url: "https://json-to-sql.tools.jagodana.com",
  ogImage: "/opengraph-image",

  // Header
  headerIcon: "Database",
  brandAccentColor: "#6366f1", // hex accent for OG image gradient (must match --brand-accent in globals.css)

  // SEO
  keywords: [
    "json to sql",
    "json to sql converter",
    "convert json to sql insert",
    "json to sql insert statement",
    "json to mysql insert",
    "json to postgresql",
    "json to sqlite",
    "json to create table",
    "online json sql generator",
    "free json to sql tool",
  ],
  applicationCategory: "DeveloperApplication",

  // Theme
  themeColor: "#3b82f6",

  // Branding
  creator: "Jagodana",
  creatorUrl: "https://jagodana.com",
  twitterHandle: "@jagodana",

  // Social Profiles (for Organization schema sameAs)
  socialProfiles: [
    "https://twitter.com/jagodana",
  ],

  // Links
  links: {
    github: "https://github.com/Jagodana-Studio-Private-Limited/json-to-sql",
    website: "https://jagodana.com",
  },

  // Footer
  footer: {
    about:
      "JSON to SQL is a free, browser-based tool that converts JSON data into SQL statements. No signup, no uploads — everything runs locally in your browser.",
    featuresTitle: "Features",
    features: [
      "JSON to INSERT statements",
      "Auto-generate CREATE TABLE",
      "MySQL, PostgreSQL & SQLite",
      "Batch multi-row inserts",
    ],
  },

  // Hero Section
  hero: {
    badge: "Free Developer Tool",
    titleLine1: "Convert JSON to SQL",
    titleGradient: "in Seconds",
    subtitle:
      "Paste any JSON object or array and instantly get SQL INSERT, CREATE TABLE, or UPSERT statements. Supports MySQL, PostgreSQL, and SQLite dialects. No login. No uploads.",
  },

  // Feature Cards (shown on homepage)
  featureCards: [
    {
      icon: "🗄️",
      title: "Multi-Dialect Support",
      description:
        "Generate SQL for MySQL, PostgreSQL, and SQLite with a single click. Dialect-specific quoting and syntax handled automatically.",
    },
    {
      icon: "📋",
      title: "CREATE TABLE + INSERT",
      description:
        "Auto-detects column types from your JSON data and generates a matching CREATE TABLE schema alongside INSERT statements.",
    },
    {
      icon: "🔒",
      title: "100% Client-Side",
      description:
        "Your data never leaves your browser. All conversion logic runs locally — no server, no uploads, no privacy concerns.",
    },
  ],

  // Related Tools (cross-linking to sibling Jagodana tools for internal SEO)
  relatedTools: [
    {
      name: "JSON Formatter",
      url: "https://json-formatter.tools.jagodana.com",
      icon: "📄",
      description: "Format, validate, and minify JSON instantly.",
    },
    {
      name: "JSON to TypeScript",
      url: "https://json-to-typescript.tools.jagodana.com",
      icon: "🔷",
      description: "Generate TypeScript interfaces from JSON objects.",
    },
    {
      name: "JSON to CSV Converter",
      url: "https://json-to-csv-converter.tools.jagodana.com",
      icon: "📊",
      description: "Export JSON arrays to CSV with one click.",
    },
    {
      name: "JSON Diff Viewer",
      url: "https://json-diff-viewer.tools.jagodana.com",
      icon: "🔍",
      description: "Compare two JSON objects and highlight differences.",
    },
    {
      name: "JSON Schema Generator",
      url: "https://json-schema-generator.tools.jagodana.com",
      icon: "🧩",
      description: "Generate JSON Schema from any JSON sample.",
    },
    {
      name: "CSV to JSON Converter",
      url: "https://csv-to-json-converter.tools.jagodana.com",
      icon: "↔️",
      description: "Convert CSV files to JSON arrays instantly.",
    },
  ],

  // HowTo Steps (drives HowTo JSON-LD schema for rich results)
  howToSteps: [
    {
      name: "Paste your JSON",
      text: "Paste any JSON object or array into the input panel on the left.",
      url: "",
    },
    {
      name: "Choose SQL dialect and options",
      text: "Select MySQL, PostgreSQL, or SQLite. Toggle CREATE TABLE and UPSERT options as needed.",
      url: "",
    },
    {
      name: "Copy your SQL",
      text: "Click Copy to copy the generated SQL INSERT and CREATE TABLE statements to your clipboard.",
      url: "",
    },
  ],
  howToTotalTime: "PT1M",

  // FAQ (drives both the FAQ UI section and FAQPage JSON-LD schema)
  faq: [
    {
      question: "What types of SQL statements does this tool generate?",
      answer:
        "The tool generates SQL INSERT statements and optionally a CREATE TABLE statement inferred from your JSON data. You can also generate UPSERT (INSERT OR REPLACE / INSERT … ON CONFLICT DO UPDATE) statements depending on the selected dialect.",
    },
    {
      question: "Which SQL dialects are supported?",
      answer:
        "MySQL, PostgreSQL (including PgSQL), and SQLite are supported. Each dialect uses the correct quoting style — backticks for MySQL, double-quotes for PostgreSQL, and standard quoting for SQLite.",
    },
    {
      question: "Does it support nested JSON objects?",
      answer:
        "Yes. Nested objects and arrays are serialised to JSON strings within the SQL output, which is the standard approach for storing complex sub-documents in relational columns.",
    },
    {
      question: "Is my data sent to a server?",
      answer:
        "No. All processing happens entirely in your browser using JavaScript. Your JSON data never leaves your device.",
    },
    {
      question: "Can I convert an array of JSON objects in one go?",
      answer:
        "Yes. Paste a JSON array (e.g. [{…}, {…}]) and the tool generates a batch INSERT with one VALUES row per object, making it easy to seed a database table.",
    },
    {
      question: "How does the tool infer column types?",
      answer:
        "The tool inspects the values in your JSON: numbers become INT or REAL, booleans become BOOLEAN (or TINYINT for MySQL), and everything else becomes TEXT or VARCHAR(255). Null values are preserved as NULL.",
    },
  ],

  // ====== PAGES (for sitemap + per-page SEO) ======
  pages: {
    "/": {
      title:
        "JSON to SQL Converter — Free Online JSON to SQL INSERT Generator",
      description:
        "Convert JSON objects and arrays to SQL INSERT, CREATE TABLE, or UPSERT statements instantly. Supports MySQL, PostgreSQL, and SQLite. 100% free, no login required.",
      changeFrequency: "weekly" as const,
      priority: 1,
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;
