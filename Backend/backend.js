// 📄 backend.js

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { pool } from './db.js';



const app = express();
const PORT = process.env.PORT || 10000;

// 📍 Configurar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📍 Configurar carpeta de uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// 📍 Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// 📍 Rutas del servidor

app.get('/formulario', async (req, res) => {
  try {
    const [colonias, servicios, origenes] = await Promise.all([
      pool.query('SELECT nombre FROM colonias ORDER BY nombre'),
      pool.query('SELECT nombre FROM servicios ORDER BY nombre'),
      pool.query('SELECT nombre FROM origenes ORDER BY nombre')
    ]);

    res.json({
      colonias: colonias.rows.map(c => c.nombre),
      servicios: servicios.rows.map(t => t.nombre), // Cambié 'tipos_servicio' a 'servicios'
      origenes: origenes.rows.map(o => o.nombre)
    });
  } catch (error) {
    console.error('Error al cargar datos del formulario:', error);
    res.status(500).json({ error: 'Error al cargar datos' });
  }
});

app.post('/agregar-reporte', upload.single('foto'), async (req, res) => {
  const { tipoServicio, solicitante, origen, colonia, direccion, numero_exterior, telefono, referencias, fecha } = req.body;
  const foto = req.file ? req.file.filename : null;

  try {
    const result = await pool.query(`
      INSERT INTO reportes (tipo_servicio, solicitante, origen, colonia, direccion, numero_exterior, telefono, referencias, fecha, foto)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [servicios, solicitante, origen, colonia, direccion, numero_exterior, telefono, referencias, fecha, foto]); // 'tipoServicio' debe coincidir

    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error al agregar reporte:', error);
    res.status(500).json({ error: 'Error al agregar reporte' });
  }
});


app.delete('/eliminar-reporte/:id', async (req, res) => {
  const { id } = req.params;
  const { usuario, contrasena } = req.body;

  if (usuario !== 'oro4' || contrasena !== 'luminarias') {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  try {
    const result = await pool.query('DELETE FROM reportes WHERE id = $1 RETURNING foto', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const foto = result.rows[0].foto;
    if (foto) {
      fs.unlinkSync(path.join(uploadsDir, foto));  // Eliminar foto si existe
    }

    res.status(200).json({ mensaje: 'Reporte eliminado' });
  } catch (error) {
    console.error('Error al eliminar reporte:', error);
    res.status(500).json({ error: 'Error al eliminar reporte' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
