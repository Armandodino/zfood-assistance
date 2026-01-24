/**
 * Script d'exportation des données PostgreSQL
 * Usage: npx tsx scripts/export-data.ts
 * 
 * Ce script exporte toutes les données de la base de données actuelle
 * dans un fichier JSON pour migration vers une autre base de données.
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function exportData() {
  const client = await pool.connect();
  
  try {
    console.log('Connexion à la base de données...');
    
    const data: Record<string, unknown[]> = {};
    
    // Liste des tables à exporter
    const tables = ['users', 'clients', 'orders', 'activity_logs', 'daily_production', 'stock_config'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT * FROM ${table}`);
        data[table] = result.rows;
        console.log(`✓ ${table}: ${result.rows.length} enregistrements`);
      } catch (err) {
        console.log(`✗ ${table}: table non trouvée ou vide`);
        data[table] = [];
      }
    }
    
    // Écrire les données dans un fichier JSON
    const fs = await import('fs');
    const exportPath = './data-export.json';
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
    
    console.log(`\n✓ Données exportées vers: ${exportPath}`);
    console.log('\nVous pouvez maintenant importer ces données dans votre nouvelle base de données.');
    
  } finally {
    client.release();
    await pool.end();
  }
}

exportData().catch(console.error);
