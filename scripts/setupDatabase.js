const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'travel_crm'
} = process.env;

const schemaPath = path.join(rootDir, 'mysql_schema.sql');

const loadSchema = async () => {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const sqlContent = fs.readFileSync(schemaPath, 'utf8').replace(/\r\n/g, '\n');
  const withoutComments = sqlContent
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => (line.trim().startsWith('--') ? '' : line))
    .join('\n');

  const statements = withoutComments
    .split(/;\s*(?=\n|$)/)
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length);

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true
  });

  try {
    if (process.env.DB_RESET !== 'false') {
      console.log(`🧹 Resetting database "${DB_NAME}"...`);
      await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    }

    console.log(`🔄 Applying schema to MySQL server at ${DB_HOST}:${DB_PORT}...`);
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (err) {
        console.error('❌ Failed to execute statement:\n', statement);
        throw err;
      }
    }
    console.log(`✅ Schema applied successfully to database "${DB_NAME}".`);
  } finally {
    await connection.end();
  }
};

loadSchema().catch((error) => {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
});

