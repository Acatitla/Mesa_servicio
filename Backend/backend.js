const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, 'database', 'mesa_servicio.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite');
    }
});
// Solo una vez, luego puedes borrar esta línea:
//db.run(`ALTER TABLE reportes ADD COLUMN fecha_registro TEXT`);


db.run(`
    CREATE TABLE IF NOT EXISTS reportes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calle TEXT NOT NULL,
        no_exterior TEXT NOT NULL,
        referencias TEXT,
        colonia TEXT NOT NULL,
        solicitante TEXT NOT NULL,
        telefono TEXT NOT NULL,
        origen TEXT NOT NULL,
        fecha_registro TEXT NOT NULL
    )
`);

app.post('/reportes', (req, res) => {
    const { calle, no_exterior, referencias, colonia, solicitante, telefono, origen } = req.body;
    const fechaHoy = new Date().toISOString().split('T')[0];

    const checkQuery = `
        SELECT * FROM reportes 
        WHERE calle = ? AND no_exterior = ? AND DATE(fecha_registro) = ?
    `;
    db.get(checkQuery, [calle, no_exterior, fechaHoy], (err, row) => {
        if (err) return res.status(500).send({ error: 'Error en la validación' });
        if (row) return res.status(400).send({ error: 'Ya existe un reporte hoy para esta dirección' });

        const insertQuery = `
            INSERT INTO reportes (calle, no_exterior, referencias, colonia, solicitante, telefono, origen, fecha_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(insertQuery, [calle, no_exterior, referencias, colonia, solicitante, telefono, origen, new Date().toISOString()], function (err) {
            if (err) return res.status(500).send({ error: 'Error al insertar' });
            res.send({ message: 'Reporte agregado', id: this.lastID });
        });
    });
});

app.get('/reportes', (req, res) => {
    db.all('SELECT * FROM reportes', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
