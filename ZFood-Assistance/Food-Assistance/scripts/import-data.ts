/**
 * Script d'importation des données PostgreSQL
 * Usage: DATABASE_URL=your_new_db_url npx tsx scripts/import-data.ts
 * 
 * Ce script importe les données depuis le fichier JSON exporté
 * vers une nouvelle base de données.
 */

import pkg from 'pg';
const { Pool } = pkg;
import * as fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function importData() {
  const client = await pool.connect();
  
  try {
    console.log('Connexion à la base de données...');
    
    // Lire le fichier d'export
    const exportPath = './data-export.json';
    if (!fs.existsSync(exportPath)) {
      console.error('Fichier data-export.json non trouvé. Exécutez d\'abord export-data.ts');
      return;
    }
    
    const data = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    
    // Ordre d'importation (respecter les dépendances - clients avant orders)
    const tables = ['users', 'stock_config', 'clients', 'orders', 'daily_production', 'activity_logs'];
    
    // Désactiver temporairement les contraintes
    await client.query('SET session_replication_role = replica;');
    
    for (const table of tables) {
      const rows = data[table] || [];
      if (rows.length === 0) {
        console.log(`✗ ${table}: aucune donnée à importer`);
        continue;
      }
      
      try {
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          await client.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
            values
          );
        }
        console.log(`✓ ${table}: ${rows.length} enregistrements importés`);
      } catch (err) {
        console.error(`✗ ${table}: erreur lors de l'importation`, err);
      }
    }
    
    // Réactiver les contraintes
    await client.query('SET session_replication_role = DEFAULT;');
    
    console.log('\n✓ Importation terminée!');
    
  } finally {
    client.release();
    await pool.end();
  }
}

importData().catch(console.error);
