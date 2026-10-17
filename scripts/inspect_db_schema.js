import pool from '../monolith-backend/src/db.js';

async function run() {
  const [tables] = await pool.query(`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = 'hrm_db' 
    ORDER BY TABLE_NAME
  `);
  console.log('=== TABLES IN hrm_db ===');
  console.log(tables.map(t => t.TABLE_NAME));

  for (const t of tables) {
    const [cols] = await pool.query(`
      SELECT 
        COLUMN_NAME, 
        COLUMN_TYPE, 
        IS_NULLABLE, 
        COLUMN_KEY, 
        COLUMN_DEFAULT, 
        EXTRA 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'hrm_db' AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [t.TABLE_NAME]);
    
    console.log('\n--- Table: ' + t.TABLE_NAME + ' (' + cols.length + ' columns) ---');
    cols.forEach(c => {
      console.log('  ' + c.COLUMN_NAME.padEnd(28) + c.COLUMN_TYPE.padEnd(25) + (c.COLUMN_KEY ? '[' + c.COLUMN_KEY + ']' : '').padEnd(8) + (c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL') + (c.COLUMN_DEFAULT !== null ? ' DEFAULT ' + c.COLUMN_DEFAULT : ''));
    });
  }

  const [fks] = await pool.query(`
    SELECT 
      TABLE_NAME, 
      COLUMN_NAME, 
      CONSTRAINT_NAME, 
      REFERENCED_TABLE_NAME, 
      REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = 'hrm_db' AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);
  console.log('\n=== FOREIGN KEYS ===');
  fks.forEach(fk => {
    console.log(fk.TABLE_NAME + '.' + fk.COLUMN_NAME + ' -> ' + fk.REFERENCED_TABLE_NAME + '.' + fk.REFERENCED_COLUMN_NAME + ' (' + fk.CONSTRAINT_NAME + ')');
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
