const express = require('express');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Base de datos
const dbPath = path.join(__dirname, 'database', 'reportes.db');
const db = new sqlite3.Database(dbPath);

// Carga de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS reportes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servicio TEXT,
  origen TEXT,
  folio TEXT,
  colonia TEXT,
  direccion TEXT,
  descripcion TEXT,
  fecha TEXT,
  imagen TEXT
)`);

// Ruta para agregar reporte
app.post('/agregar-reporte', upload.single('foto'), (req, res) => {
  const { servicio, origen, folio, colonia, direccion, descripcion, fecha } = req.body;
  const imagen = req.file ? req.file.filename : '';

  const query = `
    INSERT INTO reportes (servicio, origen, folio, colonia, direccion, descripcion, fecha, imagen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [servicio, origen, folio, colonia, direccion, descripcion, fecha, imagen], function (err) {
    if (err) return res.status(500).json({ error: 'Error al insertar el reporte' });
    res.redirect('/');
  });
});

// Ruta para obtener todos los reportes
app.get('/reportes', (req, res) => {
  db.all('SELECT * FROM reportes ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener reportes' });
    res.json(rows);
  });
});

// Ruta para filtrar reportes por colonia o fecha
app.get('/filtrar-reportes', (req, res) => {
  const { colonia, fecha } = req.query;
  let query = 'SELECT * FROM reportes WHERE 1=1';
  const params = [];

  if (colonia) {
    query += ' AND colonia = ?';
    params.push(colonia);
  }

  if (fecha) {
    query += ' AND fecha = ?';
    params.push(fecha);
  }

  query += ' ORDER BY id DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al filtrar reportes' });
    res.json(rows);
  });
});

// Ruta para eliminar un reporte (con autenticación simple)
app.post('/eliminar-reporte', (req, res) => {
  const { id, usuario, contrasena } = req.body;

  if (usuario !== 'oro4' || contrasena !== 'luminarias') {
    return res.status(401).json({ error: 'Autenticación incorrecta' });
  }

  db.get('SELECT imagen FROM reportes WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error al buscar imagen' });

    if (row && row.imagen) {
      const rutaImagen = path.join(__dirname, 'uploads', row.imagen);
      if (fs.existsSync(rutaImagen)) fs.unlinkSync(rutaImagen);
    }

    db.run('DELETE FROM reportes WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: 'Error al eliminar reporte' });
      res.json({ mensaje: 'Reporte eliminado correctamente' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
