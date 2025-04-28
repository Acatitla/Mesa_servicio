import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import pkg from 'pg'; // Importamos 'pg' correctamente
const { Pool } = pkg;  // Usamos Pool para la conexión a PostgreSQL

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');

[uploadsDir, publicDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Usamos la variable de entorno para la conexión
  ssl: {
    rejectUnauthorized: false
  }
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS reportes (
    id SERIAL PRIMARY KEY,
    folio TEXT,
    origen TEXT,
    telefono TEXT,
    solicitante TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referencias TEXT,
    colonia TEXT,
    numero_exterior TEXT,
    direccion TEXT,
    tipo_servicio TEXT,
    foto TEXT
  );
`;

async function createTable() {
  try {
    await pool.query(createTableQuery);  // Ejecutar la consulta para crear la tabla
    console.log('✅ Tabla "reportes" creada o ya existe');
  } catch (err) {
    console.error('❌ Error creando la tabla "reportes":', err);
  }
}

// Llamar a la función para crear la tabla al iniciar el backend
createTable();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(publicDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, JPG, PNG, GIF)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

let colonias = [];
try {
  const data = fs.readFileSync(path.join(dataDir, 'colonias.json'), 'utf8');
  colonias = JSON.parse(data);
  console.log(`✅ Colonias cargadas: ${colonias.length} registros`);
} catch (err) {
  console.error('❌ Error leyendo colonias:', err);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/form-data', (req, res) => {
  try {
    const tiposServicio = ["Luminarias", "Baches", "Banquetas", "Fugas"];
    const origenes = ["Aplicación", "DMU", "Oficio", "Teléfono", "Personal"];
    res.json({
      colonias,
      tiposServicio,
      origenes
    });
  } catch (error) {
    console.error('Error obteniendo datos de formulario:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.get('/reportes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, folio, origen, telefono, solicitante, 
             TO_CHAR(fecha, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha,
             referencias, colonia, numero_exterior, direccion, 
             tipo_servicio, foto 
      FROM reportes 
      ORDER BY fecha DESC
    `);

    // Convertir la fecha en cada reporte a un objeto Date
    const reportes = result.rows.map(reporte => ({
      ...reporte,
      fecha: new Date(reporte.fecha).toLocaleString() // Convierte a formato legible
    }));

    res.json(reportes);
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({ error: 'Error al cargar reportes', details: error.message });
  }
});

// Ruta para generar un reporte PDF
app.get('/descargarPDF/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM reportes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const reporte = result.rows[0];
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-${reporte.id}.pdf`);

    doc.pipe(res);

    doc.fontSize(16).text('Reporte de Servicio', { align: 'center' });

    doc.moveDown();
    doc.fontSize(12).text(`Folio: ${reporte.folio}`);
    doc.text(`Origen: ${reporte.origen}`);
    doc.text(`Solicitante: ${reporte.solicitante}`);
    doc.text(`Fecha: ${new Date(reporte.fecha).toLocaleString()}`);
    doc.text(`Colonia: ${reporte.colonia}`);
    doc.text(`Dirección: ${reporte.direccion}`);
    doc.text(`Tipo de Servicio: ${reporte.tipo_servicio}`);
    doc.text(`Referencia: ${reporte.referencias}`);

    if (reporte.foto) {
      const fotoPath = path.join(uploadsDir, reporte.foto);
      if (fs.existsSync(fotoPath)) {
        doc.moveDown().image(fotoPath, { width: 100 });
      } else {
        doc.moveDown().text('Foto no disponible');
      }
    }

    doc.end();
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error al generar archivo PDF' });
  }
});

// Ruta para generar archivo Excel
app.get('/descargarExcel', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, folio, origen, telefono, solicitante, 
             TO_CHAR(fecha, 'YYYY-MM-DD HH24:MI:SS') as fecha,
             referencias, colonia, numero_exterior, direccion, 
             tipo_servicio, foto 
      FROM reportes 
      ORDER BY fecha DESC
    `);
    const reportes = result.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reportes');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Folio', key: 'folio', width: 15 },
      { header: 'Origen', key: 'origen', width: 15 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Solicitante', key: 'solicitante', width: 20 },
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Referencias', key: 'referencias', width: 30 },
      { header: 'Colonia', key: 'colonia', width: 20 },
      { header: 'Número Exterior', key: 'numero_exterior', width: 15 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Tipo Servicio', key: 'tipo_servicio', width: 20 },
      { header: 'Foto', key: 'foto', width: 30 }
    ];

    reportes.forEach(reporte => {
      worksheet.addRow({
        ...reporte,
        foto: reporte.foto ? `http://${req.get('host')}/uploads/${reporte.foto}` : 'Sin imagen'
      });
    });

    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reportes.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generando archivo Excel:', error);
    res.status(500).json({ error: 'Error al generar archivo Excel' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
