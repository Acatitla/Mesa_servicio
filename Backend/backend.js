// backend.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// BASE DE DATOS (ejemplo con sqlite3 o tu PostgreSQL ya configurado aquí)
// const db = require('./database/tuconexion.js');

// Middleware para leer datos del formulario
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/img', express.static(path.join(__dirname, 'data', 'img'))); // <<---- NUEVO para tus logos

// Configurar almacenamiento de imágenes subidas
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath); // Crea carpeta si no existe
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // nombre_unico.jpg
  }
});

const upload = multer({ storage: storage });

// Ruta principal (formulario)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para guardar nuevo reporte
app.post('/agregar', upload.single('foto'), (req, res) => {
  const { fecha, colonia, direccion, descripcion, tipoServicio, folio } = req.body;
  const foto = req.file ? req.file.filename : null;

  if (!fecha || !colonia || !direccion || !tipoServicio) {
    return res.status(400).send('Faltan datos.');
  }

  // Aquí guardarías en tu base de datos, por ejemplo con PostgreSQL
  // db.query('INSERT INTO reportes (fecha, colonia, direccion, descripcion, tipoServicio, foto, folio) VALUES (?, ?, ?, ?, ?, ?, ?)', [...])

  console.log('Reporte guardado:', { fecha, colonia, direccion, descripcion, tipoServicio, folio, foto });
  
  res.redirect('/');
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
