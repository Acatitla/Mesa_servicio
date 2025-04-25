require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const { Pool } = require('pg');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configura la conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// Subida de fotos con multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Crear tabla si no existe
const createTableQuery = `
CREATE TABLE IF NOT EXISTS reportes (
  id SERIAL PRIMARY KEY,
  tipo TEXT,
  colonia TEXT,
  direccion TEXT,
  descripcion TEXT,
  origen TEXT,
  folio TEXT,
  fecha TEXT,
  foto TEXT
);
`;
pool.query(createTableQuery).catch(console.error);

// Ruta para guardar un reporte
app.post('/agregar', upload.single('foto'), async (req, res) => {
  const { tipo, colonia, direccion, descripcion, origen, folio, fecha } = req.body;
  const foto = req.file ? req.file.filename : null;
  try {
    await pool.query('INSERT INTO reportes (tipo, colonia, direccion, descripcion, origen, folio, fecha, foto) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [tipo, colonia, direccion, descripcion, origen, folio, fecha, foto]);
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Error al guardar el reporte');
  }
});

// Ruta para obtener los reportes
app.get('/reportes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM reportes ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).send('Error al obtener los reportes');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
