// backend/db.js

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Función para verificar si la tabla existe y crearla si no
const createTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS reportes (
      id SERIAL PRIMARY KEY,
      folio TEXT,
      origen TEXT,
      telefono TEXT,
      solicitante TEXT,
      fecha TIMESTAMP,
      referencias TEXT,
      colonia TEXT,
      numero_exterior TEXT,
      direccion TEXT,
      tipo_servicio TEXT,
      foto TEXT
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Tabla "reportes" creada o ya existe');
  } catch (err) {
    console.error('❌ Error creando la tabla "reportes":', err);
  }
};

createTable(); // Llamada para crear la tabla si no existe

// Exportar pool para usar en otras partes de la aplicación
export { pool };
