const form = document.getElementById('reportForm');
const reportList = document.getElementById('reportList');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        calle: document.getElementById('calle').value,
        no_exterior: document.getElementById('no_exterior').value,
        referencias: document.getElementById('referencias').value,
        colonia: document.getElementById('colonia').value,
        solicitante: document.getElementById('solicitante').value,
        telefono: document.getElementById('telefono').value,
        origen: document.getElementById('origen').value
    };

    const res = await fetch('http://localhost:3000/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    if (res.ok) {
        alert('Reporte enviado');
        form.reset();
        cargarReportes();
    } else {
        alert(result.error);
    }
});

async function cargarReportes() {
    const res = await fetch('http://localhost:3000/reportes');
    const reportes = await res.json();

    reportList.innerHTML = '';
    reportes.forEach(rep => {
        const li = document.createElement('li');
        li.textContent = `${rep.calle} ${rep.no_exterior} - ${rep.colonia}`;
        reportList.appendChild(li);
    });
}

async function cargarReportes() {
    const res = await fetch('http://localhost:3000/reportes');
    const reportes = await res.json();

    console.log(reportes); // Para verificar si llegan los datos

    const reportList = document.getElementById('reportList');
    reportList.innerHTML = '';

    reportes.forEach(rep => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${rep.calle} ${rep.no_exterior}</strong><br>
            ${rep.colonia} - ${rep.referencias}<br>
            Solicitante: ${rep.solicitante} | Tel: ${rep.telefono}<br>
            Origen: ${rep.origen} | Fecha: ${rep.fecha_registro}
        `;
        reportList.appendChild(li);
    });
}

cargarReportes();
