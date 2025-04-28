import express from 'express';
import multer from 'multer';
import pkg from 'pg';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 10000;

// Configuración de directorios para Render
const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');

// Asegurar directorios existan
[uploadsDir, publicDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configuración de PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(publicDir));

// Configuración de Multer
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

// Cargar colonias desde JSON
let colonias = [];
try {
  const data = fs.readFileSync(path.join(dataDir, 'colonias.json'), 'utf8');
  colonias = JSON.parse(data);
  console.log(`✅ Colonias cargadas: ${colonias.length} registros`);
} catch (err) {
  console.error('❌ Error leyendo colonias:', err);
}

// Rutas
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
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({ 
      error: 'Error al cargar reportes',
      details: error.message 
    });
  }
});

app.post('/reportes', upload.single('foto'), async (req, res) => {
  try {
    const { 
      folio, 
      origen, 
      telefono, 
      solicitante, 
      fecha, 
      referencias, 
      colonia, 
      numeroExterior, 
      direccion, 
      tipoServicio 
    } = req.body;

    if (!origen || !solicitante || !colonia || !direccion || !tipoServicio || !fecha) {
      return res.status(400).json({ 
        error: 'Campos obligatorios faltantes',
        required: ['origen', 'solicitante', 'colonia', 'direccion', 'tipoServicio', 'fecha']
      });
    }

    const foto = req.file ? req.file.filename : null;
    const fechaFormateada = new Date(fecha).toISOString();

    const result = await pool.query(
      `INSERT INTO reportes (
        folio, origen, telefono, solicitante, fecha, 
        referencias, colonia, numero_exterior, direccion, 
        tipo_servicio, foto
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        folio || null, 
        origen, 
        telefono || null, 
        solicitante, 
        fechaFormateada, 
        referencias || null, 
        colonia, 
        numeroExterior || null, 
        direccion, 
        tipoServicio, 
        foto
      ]
    );

    res.json({ 
      success: true,
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error al guardar reporte:', error);
    res.status(500).json({ 
      error: 'Error al guardar reporte',
      details: error.message
    });
  }
});

app.delete('/reportes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASS) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const result = await pool.query('DELETE FROM reportes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Eliminar la foto asociada si existe
    const reporte = result.rows[0];
    if (reporte.foto) {
      const fotoPath = path.join(uploadsDir, reporte.foto);
      if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error al borrar reporte:', error);
    res.status(500).json({ error: 'Error al borrar reporte' });
  }
});

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

    // Formato de columnas
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

    // Añadir datos
    reportes.forEach(reporte => {
      worksheet.addRow({
        ...reporte,
        foto: reporte.foto ? `http://${req.get('host')}/uploads/${reporte.foto}` : 'Sin imagen'
      });
    });

    // Estilo para la primera fila (encabezados)
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
    console.error('Error al generar Excel:', error);
    res.status(500).send('Error al generar Excel');
  }
});

app.get('/descargarPDF/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM reportes WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).send('Reporte no encontrado');
    }

    const reporte = result.rows[0];
    const doc = new PDFDocument();
    const filename = `reporte_${id}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).text('Reporte de Servicio', { align: 'center' });
    doc.moveDown();

    // Contenido
    const campos = [
      { label: 'Folio', value: reporte.folio },
      { label: 'Origen', value: reporte.origen },
      { label: 'Solicitante', value: reporte.solicitante },
      { label: 'Fecha', value: new Date(reporte.fecha).toLocaleString() },
      { label: 'Teléfono', value: reporte.telefono },
      { label: 'Referencias', value: reporte.referencias },
      { label: 'Colonia', value: reporte.colonia },
      { label: 'Dirección', value: `${reporte.direccion} ${reporte.numero_exterior || ''}` },
      { label: 'Tipo de Servicio', value: reporte.tipo_servicio }
    ];

    campos.forEach(campo => {
      if (campo.value) {
        doc.fontSize(12).text(`${campo.label}: ${campo.value}`);
        doc.moveDown(0.5);
      }
    });

    // Imagen si existe
    if (reporte.foto) {
      const imagePath = path.join(uploadsDir, reporte.foto);
      if (fs.existsSync(imagePath)) {
        doc.addPage();
        doc.text('Foto adjunta:', { align: 'center' });
        doc.image(imagePath, { 
          fit: [400, 400], 
          align: 'center', 
          valign: 'center' 
        });
      }
    }

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).send('Error al generar PDF');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
