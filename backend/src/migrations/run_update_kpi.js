import pool from '../db.js';

async function run() {
  try {
    const colsToAdd = [
      { name: 'score_discipline', def: 'DECIMAL(5,2) NOT NULL DEFAULT 100.00' },
      { name: 'score_task_completion', def: 'DECIMAL(5,2) NOT NULL DEFAULT 90.00' },
      { name: 'score_work_quality', def: 'DECIMAL(5,2) NOT NULL DEFAULT 90.00' },
      { name: 'score_communication', def: 'DECIMAL(5,2) NOT NULL DEFAULT 90.00' },
      { name: 'score_competence', def: 'DECIMAL(5,2) NOT NULL DEFAULT 90.00' },
      { name: 'score_innovation', def: 'DECIMAL(5,2) NOT NULL DEFAULT 80.00' },
      { name: 'incident_cause', def: "ENUM('NONE', 'INDIVIDUAL_ERROR', 'SYSTEM_PROCESS', 'FACILITY_EQUIPMENT', 'NEAR_MISS_PREVENTED') NOT NULL DEFAULT 'NONE'" },
      { name: 'incident_penalty_points', def: 'DECIMAL(5,2) NOT NULL DEFAULT 0.00' },
      { name: 'incident_notes', def: 'TEXT NULL' }
    ];

    const [existingCols] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Monthly_KPIs'");
    const colNames = existingCols.map(c => c.COLUMN_NAME);

    for (const col of colsToAdd) {
      if (!colNames.includes(col.name)) {
        console.log(`[Migration] Adding column ${col.name}...`);
        await pool.query(`ALTER TABLE Monthly_KPIs ADD COLUMN \`${col.name}\` ${col.def}`);
      } else {
        console.log(`[Migration] Column ${col.name} already exists.`);
      }
    }
    console.log('[Migration] All columns updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]:', err);
    process.exit(1);
  }
}

run();
