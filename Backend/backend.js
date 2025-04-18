const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const pool = new Pool({
  connectionString: 'postgresql://mesa_servicio_user:5wTxLPTLqNTQsAasCTVx3smw1f0mJ1rf@dpg-d002ic1r0fns73drvocg-a.virginia-postgres.render.com/mesa_servicio',
  ssl: { rejectUnauthorized: false }
});

pool.query(`CREATE TABLE IF NOT EXISTS reportes (
  id SERIAL PRIMARY KEY,
  direccion TEXT,
  colonia TEXT,
  fecha TEXT,
  solicitante TEXT,
  telefono TEXT,
  tipo_servicio TEXT,
  origen TEXT,
  folio TEXT,
  foto TEXT
)`);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + '_' + file.originalname;
    cb(null, nombreUnico);
  }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/reportes', upload.single('foto'), async (req, res) => {
  const {
    direccion, colonia, fecha, solicitante,
    telefono, tipo_servicio, origen, folio
  } = req.body;
  const foto = req.file ? req.file.filename : null;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM reportes WHERE direccion = $1 AND fecha = $2`,
      [direccion, fecha]
    );

    if (rows.length > 0) {
      return res.status(400).json({ error: 'Reporte duplicado para esta dirección y fecha.' });
    }

    const result = await pool.query(
      `INSERT INTO reportes (direccion, colonia, fecha, solicitante, telefono, tipo_servicio, origen, folio, foto)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [direccion, colonia, fecha, solicitante, telefono, tipo_servicio, origen, folio, foto]
    );

    res.json({ mensaje: 'Reporte guardado', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/reportes', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM reportes ORDER BY fecha DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/eliminar', async (req, res) => {
  const { usuario, contrasena, id } = req.body;

  if (usuario === 'oro4' && contrasena === 'luminarias') {
    try {
      await pool.query(`DELETE FROM reportes WHERE id = $1`, [id]);
      res.json({ mensaje: 'Reporte eliminado' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
});

app.get('/reporte/:id/pdf', async (req, res) => {
  const id = req.params.id;
  try {
    const { rows } = await pool.query(`SELECT * FROM reportes WHERE id = $1`, [id]);
    const row = rows[0];

    if (!row) return res.status(404).send('Reporte no encontrado');

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(14).text('Reporte de Servicio', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Dirección: ${row.direccion}`);
    doc.text(`Colonia: ${row.colonia}`);
    doc.text(`Fecha: ${row.fecha}`);
    doc.text(`Solicitante: ${row.solicitante}`);
    doc.text(`Teléfono: ${row.telefono}`);
    doc.text(`Servicio: ${row.tipo_servicio}`);
    doc.text(`Origen: ${row.origen}`);
    doc.text(`Folio: ${row.folio || 'N/A'}`);
    doc.moveDown();

    if (row.foto) {
      const ruta = path.join(__dirname, 'uploads', row.foto);
      if (fs.existsSync(ruta)) {
        doc.image(ruta, { width: 100 });
      }
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/excel', async (req, res) => {
  const { fecha, colonia } = req.query;
  let query = `SELECT * FROM reportes WHERE 1=1`;
  const params = [];
  let idx = 1;

  if (fecha) {
    query += ` AND fecha = $${idx++}`;
    params.push(fecha);
  }
  if (colonia) {
    query += ` AND colonia = $${idx++}`;
    params.push(colonia);
  }

  try {
    const { rows } = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reportes');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Colonia', key: 'colonia', width: 20 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Solicitante', key: 'solicitante', width: 20 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Servicio', key: 'tipo_servicio', width: 20 },
      { header: 'Origen', key: 'origen', width: 15 },
      { header: 'Folio', key: 'folio', width: 15 },
      { header: 'Foto', key: 'foto', width: 15 }
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const newRow = sheet.addRow(row);
    
      if (row.foto) {
        const rutaFoto = path.join(__dirname, 'uploads', row.foto);
        if (fs.existsSync(rutaFoto)) {
          const imageId = workbook.addImage({
            filename: rutaFoto,
            extension: path.extname(rutaFoto).slice(1), // quita el punto, por ejemplo .jpg -> jpg
          });
    
          const fila = newRow.number;
          const col = 10; // Columna 10 = 'Foto'
    
          sheet.addImage(imageId, {
            tl: { col: col - 1, row: fila - 1 },
            ext: { width: 100, height: 100 }
          });
    
          // Aumenta altura de la fila para que se vea bien
          sheet.getRow(fila).height = 80;
        }
      }
    }
    

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reportes.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
