import pkg from 'pg'; // Importar el paquete pg usando la importación por defecto
import dotenv from 'dotenv'; // Importar dotenv para cargar las variables de entorno

dotenv.config(); // Cargar las variables del archivo .env

// Configurar el pool de conexiones a PostgreSQL usando la URL de la base de datos en Render
const { Pool } = pkg;  // Extraer Pool del objeto importado

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Usar la variable de entorno con la URL de conexión
  ssl: {
    rejectUnauthorized: false  // Requerido por Render para habilitar conexiones seguras
  }
});

export { pool }; // Exportar el pool para usarlo en otros archivos
