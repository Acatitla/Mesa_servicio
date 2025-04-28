import { Pool } from 'pg';  // Importar el Pool para trabajar con PostgreSQL
import dotenv from 'dotenv'; // Importar dotenv para cargar las variables de entorno

dotenv.config(); // Cargar variables del archivo .env

// Configurar el pool de conexiones a PostgreSQL usando la URL de la base de datos en Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Usar la variable de entorno con la URL de conexión
  ssl: {
    rejectUnauthorized: false  // Requerido por Render para habilitar conexiones seguras
  }
});

export { pool }; // Exportar el pool para usarlo en otros archivos
