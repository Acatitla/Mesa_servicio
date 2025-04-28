// backend/db.js
import pkg from 'pg';
const { Pool } = pkg;  // Accediendo al Pool a través de pkg
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

// Llamada para crear la tabla si no existe
createTable();

// Exportar el pool para que se use en otras partes del proyecto
export { pool };
