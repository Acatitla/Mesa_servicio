const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
app.use('/uploads', express.static('uploads'));

const dbFile = './reportes.db';
const db = new sqlite3.Database(dbFile);

// 🧹 Borrar tabla y crearla desde cero
db.serialize(() => {
//db.run(`DROP TABLE IF EXISTS reportes`);
  db.run(`CREATE TABLE IF NOT EXISTS reportes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
});

// 📦 Configuración de multer para subir fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + '_' + file.originalname;
    cb(null, nombreUnico);
  }
});
const upload = multer({ storage });

// 🔁 Guardar un nuevo reporte
app.post('/reportes', upload.single('foto'), (req, res) => {
  const {
    direccion,
    colonia,
    fecha,
    solicitante,
    telefono,
    tipo_servicio,
    origen,
    folio
  } = req.body;

  const foto = req.file ? req.file.filename : null;

  db.get(
    `SELECT * FROM reportes WHERE direccion = ? AND fecha = ?`,
    [direccion, fecha],
    (err, row) => {
      if (row) {
        return res.status(400).json({ error: 'Reporte duplicado para esta dirección y fecha.' });
      }

      db.run(
        `INSERT INTO reportes (direccion, colonia, fecha, solicitante, telefono, tipo_servicio, origen, folio, foto)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [direccion, colonia, fecha, solicitante, telefono, tipo_servicio, origen, folio, foto],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ mensaje: 'Reporte guardado', id: this.lastID });
        }
      );
    }
  );
});

// 📂 Obtener todos los reportes
app.get('/reportes', (req, res) => {
  db.all(`SELECT * FROM reportes ORDER BY fecha DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 🗑️ Eliminar con autenticación simple
app.post('/eliminar', (req, res) => {
  const { usuario, contrasena, id } = req.body;

  if (usuario === 'oro4' && contrasena === 'luminarias') {
    db.run(`DELETE FROM reportes WHERE id = ?`, [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ mensaje: 'Reporte eliminado' });
    });
  } else {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
});

// 📄 PDF individual
app.get('/reporte/:id/pdf', (req, res) => {
  const id = req.params.id;

  db.get(`SELECT * FROM reportes WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return res.status(404).send('Reporte no encontrado');

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
  });
});

// 📊 Excel con filtro por fecha o colonia
app.get('/api/excel', (req, res) => {
  const { fecha, colonia } = req.query;
  let query = `SELECT * FROM reportes WHERE 1=1`;
  const params = [];

  if (fecha) {
    query += ` AND fecha = ?`;
    params.push(fecha);
  }
  if (colonia) {
    query += ` AND colonia = ?`;
    params.push(colonia);
  }

  db.all(query, params, async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

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

    rows.forEach(row => {
      sheet.addRow(row);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reportes.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  });
});

// 🚀 Iniciar servidor
//const PORT = 3000;
//app.listen(PORT, () => {
//  console.log(`Servidor iniciado en http://localhost:${PORT}`);
//});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});