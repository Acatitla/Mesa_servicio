const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Configurar subida de fotos
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let reportes = [];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Subir reporte
app.post('/reportes', upload.single('foto'), (req, res) => {
    const datos = req.body;
    const foto = req.file ? req.file.filename : null;

    console.log('Datos recibidos:', datos);

    const reporte = {
        tipoServicio: datos.tipoServicio,
        direccion: datos.direccion,
        numeroExterior: datos.numeroExterior,
        referencias: datos.referencias,
        colonia: datos.colonia,
        fecha: datos.fecha,
        solicitante: datos.solicitante,
        telefono: datos.telefono,
        origen: datos.origen,
        folio: datos.folio || '',
        foto: foto
    };

    reportes.push(reporte);

    res.json({ mensaje: 'Reporte agregado' });
});

// Ver reportes
app.get('/reportes', (req, res) => {
    res.json(reportes);
});

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
