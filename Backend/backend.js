const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración SQLite
const db = new sqlite3.Database('./reportes.db', (err) => {
    if (err) return console.error(err.message);
    console.log('🟢 Conectado a SQLite');
});

// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS reportes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calle TEXT,
    no_exterior TEXT,
    referencias TEXT,
    colonia TEXT,
    solicitante TEXT,
    telefono TEXT,
    origen TEXT,
    tipo_servicio TEXT,
    foto TEXT,
    fecha TEXT DEFAULT (datetime('now', 'localtime'))
)`);

// Configuración de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Ruta para agregar un reporte
app.post('/reportes', upload.single('foto'), (req, res) => {
    const { calle, no_exterior, referencias, colonia, solicitante, telefono, origen, tipo_servicio } = req.body;
    const foto = req.file ? req.file.filename : null;

    // Evitar duplicados por dirección + fecha
    const checkQuery = `SELECT * FROM reportes WHERE fecha LIKE date('now') AND calle = ? AND colonia = ?`;
    db.get(checkQuery, [calle, colonia], (err, row) => {
        if (row) return res.status(400).json({ error: 'Ya existe un reporte con esta dirección hoy' });

        const insertQuery = `INSERT INTO reportes (calle, no_exterior, referencias, colonia, solicitante, telefono, origen, tipo_servicio, foto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(insertQuery, [calle, no_exterior, referencias, colonia, solicitante, telefono, origen, tipo_servicio, foto], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Reporte guardado', id: this.lastID });
        });
    });
});

// Ruta para obtener reportes
app.get('/reportes', (req, res) => {
    db.all('SELECT * FROM reportes', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Ruta protegida para eliminar reportes
app.post('/eliminar', (req, res) => {
    const { usuario, contrasena, id } = req.body;

    if (usuario !== 'oro4' || contrasena !== 'luminarias') {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    db.run('DELETE FROM reportes WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Reporte eliminado' });
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
