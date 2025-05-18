const mysql = require('mysql2/promise');

const db = {
  host: 'localhost',
  user: 'root',         // <-- put your MySQL username here
  password: 'Bideptrai1661', // <-- put your MySQL password here
  database: 'final_project',    // <-- your database name from DBeaver
};

function cleanTextNodeAttrs(node) {
  if (!node) return node;
  if (Array.isArray(node)) return node.map(cleanTextNodeAttrs);

  // If it's a text node with attrs, remove attrs
  if (node.type === 'text' && node.attrs) {
    const { attrs, ...rest } = node;
    return rest;
  }

  // Recursively clean children
  if (node.content) {
    return { ...node, content: cleanTextNodeAttrs(node.content) };
  }

  return node;
}

async function main() {
  const conn = await mysql.createConnection(db);
  const [rows] = await conn.execute('SELECT id, content FROM documents');

  for (const row of rows) {
    if (!row.content) continue;
    let content;
    try {
      content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
    } catch (e) {
      console.error(`Skipping document ${row.id}: invalid JSON`);
      continue;
    }
    const cleaned = cleanTextNodeAttrs(content);
    await conn.execute('UPDATE documents SET content = ? WHERE id = ?', [JSON.stringify(cleaned), row.id]);
    console.log(`Cleaned document ${row.id}`);
  }

  await conn.end();
  console.log('All documents cleaned!');
}

main().catch(console.error);