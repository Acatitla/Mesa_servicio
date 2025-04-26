const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// Configurar Multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear tabla si no existe
pool.query(`
  CREATE TABLE IF NOT EXISTS reportes (
    id SERIAL PRIMARY KEY,
    tipo TEXT,
    direccion TEXT,
    colonia TEXT,
    fecha TEXT,
    origen TEXT,
    folio TEXT,
    imagen TEXT
  )
`, (err) => {
  if (err) console.error('Error al crear tabla:', err);
});

// Obtener reportes (filtrar si se envía fecha o colonia)
app.get('/filtrar-reportes', async (req, res) => {
  const { fecha, colonia } = req.query;
  try {
    let query = 'SELECT * FROM reportes';
    let params = [];
    let conditions = [];

    if (fecha) {
      conditions.push(`fecha = $${params.length + 1}`);
      params.push(fecha);
    }
    if (colonia) {
      conditions.push(`colonia ILIKE $${params.length + 1}`);
      params.push(`%${colonia}%`);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY id DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// Guardar nuevo reporte
app.post('/reportes', upload.single('foto'), async (req, res) => {
  const { tipo, calle, no_exterior, referencias, colonia, fecha, solicitante, telefono, origen, folio } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const direccion = `${calle} ${no_exterior} ${referencias}`.trim();

  try {
    await pool.query(
      'INSERT INTO reportes (tipo, direccion, colonia, fecha, origen, folio, imagen) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [tipo, direccion, colonia, fecha, origen, folio, imagen]
    );
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// Eliminar reporte (requiere login)
app.post('/eliminar/:id', async (req, res) => {
  const { usuario, contrasena } = req.body;
  if (usuario === 'oro4' && contrasena === 'luminarias') {
    try {
      await pool.query('DELETE FROM reportes WHERE id = $1', [req.params.id]);
      res.redirect('/');
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  } else {
    res.send('Credenciales incorrectas');
  }
});

// Descargar PDF de un reporte
app.get('/reporte/:id/pdf', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM reportes WHERE id = $1', [req.params.id]);
    const reporte = rows[0];
    if (!reporte) return res.sendStatus(404);

    const doc = new PDFDocument();
    const filename = `reporte-${reporte.id}.pdf`;

    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(14).text(`Tipo: ${reporte.tipo}`);
    doc.text(`Dirección: ${reporte.direccion}`);
    doc.text(`Colonia: ${reporte.colonia}`);
    doc.text(`Fecha: ${reporte.fecha}`);
    doc.text(`Origen: ${reporte.origen}`);
    doc.text(`Folio: ${reporte.folio}`);

    if (reporte.imagen) {
      const imagePath = path.join(__dirname, 'uploads', reporte.imagen);
      if (fs.existsSync(imagePath)) {
        doc.image(imagePath, { width: 100 });
      }
    }

    doc.end();
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// Descargar reportes filtrados en Excel
app.get('/reporte/excel', async (req, res) => {
  const { fecha, colonia } = req.query;

  try {
    let query = 'SELECT * FROM reportes';
    let params = [];
    let conditions = [];

    if (fecha) {
      conditions.push(`fecha = $${params.length + 1}`);
      params.push(fecha);
    }
    if (colonia) {
      conditions.push(`colonia ILIKE $${params.length + 1}`);
      params.push(`%${colonia}%`);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const { rows } = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reportes');

    worksheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Tipo', key: 'tipo' },
      { header: 'Dirección', key: 'direccion' },
      { header: 'Colonia', key: 'colonia' },
      { header: 'Fecha', key: 'fecha' },
      { header: 'Origen', key: 'origen' },
      { header: 'Folio', key: 'folio' },
      { header: 'Imagen', key: 'imagen' }
    ];

    rows.forEach(row => worksheet.addRow(row));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reportes.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
