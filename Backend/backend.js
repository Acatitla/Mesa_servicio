import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { pool } from './db.js';  // Importamos la conexión de la base de datos

const app = express();
const PORT = process.env.PORT || 10000;

// 📍 Configurar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📍 Configurar carpeta de uploads
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 📍 Configuración de almacenamiento de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// 📍 Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// 📍 Crear tabla si no existe
async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reportes (
        id SERIAL PRIMARY KEY,
        direccion TEXT,
        fecha TEXT,
        tipo_servicio TEXT,
        origen_reporte TEXT,
        folio TEXT,
        imagen TEXT
      )
    `);
    console.log('✅ Tabla "reportes" verificada/creada.');
  } catch (error) {
    console.error('❌ Error creando la tabla "reportes":', error);
  }
}

// 📍 Cargar colonias desde archivo JSON
let colonias = [];
try {
  const data = fs.readFileSync(path.join(__dirname, 'data', 'colonias.json'));
  colonias = JSON.parse(data);
  console.log(`✅ Colonias cargadas: ${colonias.length} registros`);
} catch (error) {
  console.error('❌ Error cargando colonias:', error);
}

// 📍 Rutas

// 🔵 Obtener reportes
app.get('/reportes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM reportes');
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener reportes:', error);
    res.status(500).json({ error: 'Error al cargar reportes' });
  }
});

// 🔵 Obtener colonias
app.get('/colonias', (req, res) => {
  res.json(colonias);
});

// 🔵 Agregar reporte
app.post('/agregar-reporte', upload.single('imagen'), async (req, res) => {
  const { direccion, fecha, tipo_servicio, origen_reporte, folio } = req.body;
  const imagen = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await pool.query(
      'INSERT INTO reportes (direccion, fecha, tipo_servicio, origen_reporte, folio, imagen) VALUES ($1, $2, $3, $4, $5, $6)',
      [direccion, fecha, tipo_servicio, origen_reporte, folio, imagen]
    );
    res.status(201).json({ mensaje: 'Reporte agregado exitosamente' });
  } catch (error) {
    console.error('❌ Error al agregar reporte:', error);
    res.status(500).json({ error: 'Error al agregar reporte' });
  }
});

// 🔵 Eliminar reporte (requiere autenticación)
app.delete('/eliminar-reporte/:id', async (req, res) => {
  const { id } = req.params;
  const { usuario, contrasena } = req.body;

  if (usuario !== 'oro4' || contrasena !== 'luminarias') {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  try {
    const reporte = await pool.query('SELECT imagen FROM reportes WHERE id = $1', [id]);
    if (reporte.rows.length > 0 && reporte.rows[0].imagen) {
      const imagenPath = path.join(__dirname, 'public', reporte.rows[0].imagen);
      if (fs.existsSync(imagenPath)) {
        fs.unlinkSync(imagenPath);
      }
    }

    await pool.query('DELETE FROM reportes WHERE id = $1', [id]);
    res.json({ mensaje: 'Reporte eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar reporte:', error);
    res.status(500).json({ error: 'Error al eliminar reporte' });
  }
});

// 🔵 Descargar reporte en PDF
app.get('/descargar-pdf/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query('SELECT * FROM reportes WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).send('Reporte no encontrado');

    const reporte = rows[0];

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Reporte de Servicio', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Dirección: ${reporte.direccion}`);
    doc.text(`Fecha: ${reporte.fecha}`);
    doc.text(`Tipo de Servicio: ${reporte.tipo_servicio}`);
    doc.text(`Origen del Reporte: ${reporte.origen_reporte}`);
    if (reporte.folio) doc.text(`Folio: ${reporte.folio}`);

    if (reporte.imagen) {
      const imagenPath = path.join(__dirname, 'public', reporte.imagen);
      if (fs.existsSync(imagenPath)) {
        doc.image(imagenPath, { fit: [100, 100], align: 'center' });
      }
    }

    doc.end();
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    res.status(500).send('Error generando PDF');
  }
});

// 🔵 Descargar reportes en Excel
app.get('/descargar-excel', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM reportes');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reportes');

    worksheet.columns = [
      { header: 'ID', key: 'id' },
      { header: 'Dirección', key: 'direccion' },
      { header: 'Fecha', key: 'fecha' },
      { header: 'Tipo Servicio', key: 'tipo_servicio' },
      { header: 'Origen Reporte', key: 'origen_reporte' },
      { header: 'Folio', key: 'folio' },
    ];

    rows.forEach((reporte) => {
      worksheet.addRow(reporte);
    });

    res.setHeader('Content-Disposition', 'attachment; filename=reportes.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('❌ Error generando Excel:', error);
    res.status(500).send('Error generando Excel');
  }
});

// 📍 Arrancar el servidor
createTable().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
  });
});
