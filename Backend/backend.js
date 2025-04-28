const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configurar Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Conexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Rutas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Obtener colonias
app.get('/colonias', (req, res) => {
  const colonias = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'colonias.json')));
  res.json(colonias);
});

// Obtener reportes
app.get('/reportes', async (req, res) => {
  const result = await pool.query('SELECT * FROM reportes ORDER BY id DESC');
  res.json(result.rows);
});

// Agregar reporte
app.post('/reportes', upload.single('foto'), async (req, res) => {
  const {
    tipoServicio, direccion, numeroExterior, colonia, fecha,
    origen, folio, referencias, telefono, solicitante
  } = req.body;

  const foto = req.file ? req.file.filename : null;

  await pool.query(`
    INSERT INTO reportes
    (tipo_servicio, direccion, numero_exterior, colonia, fecha, origen, folio, referencias, telefono, solicitante, foto)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [tipoServicio, direccion, numeroExterior, colonia, fecha, origen, folio, referencias, telefono, solicitante, foto]);

  res.sendStatus(201);
});

// Borrar reporte
app.delete('/reportes/:id', async (req, res) => {
  const { username, password } = req.body;
  const { id } = req.params;

  if (username === 'oro4' && password === 'luminarias') {
    await pool.query('DELETE FROM reportes WHERE id = $1', [id]);
    res.sendStatus(200);
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
});

// Descargar Excel
app.get('/descargarExcel', async (req, res) => {
  const result = await pool.query('SELECT * FROM reportes');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reportes');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 5 },
    { header: 'Servicio', key: 'tipo_servicio', width: 20 },
    { header: 'Dirección', key: 'direccion', width: 30 },
    { header: 'Número Exterior', key: 'numero_exterior', width: 15 },
    { header: 'Colonia', key: 'colonia', width: 25 },
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Origen', key: 'origen', width: 15 },
    { header: 'Folio', key: 'folio', width: 15 },
    { header: 'Referencias', key: 'referencias', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 20 },
    { header: 'Solicitante', key: 'solicitante', width: 20 }
  ];

  result.rows.forEach(r => worksheet.addRow(r));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=reportes.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});

// Descargar PDF
app.get('/descargarPDF', async (req, res) => {
  const result = await pool.query('SELECT * FROM reportes');
  const doc = new PDFDocument();
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=reportes.pdf');

  doc.pipe(res);

  result.rows.forEach(r => {
    doc.fontSize(12).text(`Servicio: ${r.tipo_servicio}`);
    doc.text(`Dirección: ${r.direccion} #${r.numero_exterior}`);
    doc.text(`Colonia: ${r.colonia}`);
    doc.text(`Fecha: ${r.fecha.toISOString().split('T')[0]}`);
    if (r.foto) {
      const imagePath = path.join(__dirname, 'public', 'uploads', r.foto);
      if (fs.existsSync(imagePath)) {
        doc.image(imagePath, { width: 100 });
      }
    }
    doc.moveDown();
    doc.moveDown();
  });

  doc.end();
});

// Levantar servidor
app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});
