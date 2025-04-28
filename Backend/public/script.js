document.addEventListener('DOMContentLoaded', () => {
  cargarColonias();
  cargarReportes();

  document.getElementById('formulario').addEventListener('submit', agregarReporte);
  document.getElementById('descargarExcel').addEventListener('click', descargarExcel);
  document.getElementById('descargarPDF').addEventListener('click', descargarPDF);
});

async function cargarColonias() {
  const res = await fetch('/colonias');
  const colonias = await res.json();
  const select = document.getElementById('colonia');

  colonias.forEach(c => {
    const option = document.createElement('option');
    option.value = c.nombre;
    option.textContent = c.nombre;
    select.appendChild(option);
  });
}

async function agregarReporte(e) {
  e.preventDefault();
  const form = document.getElementById('formulario');
  const formData = new FormData(form);

  await fetch('/reportes', {
    method: 'POST',
    body: formData
  });

  form.reset();
  cargarReportes();
}

async function cargarReportes() {
  const res = await fetch('/reportes');
  const reportes = await res.json();
  const contenedor = document.getElementById('reportes');
  contenedor.innerHTML = '';

  reportes.forEach(r => {
    const div = document.createElement('div');
    div.classList.add('reporte');
    div.innerHTML = `
      <p><strong>Servicio:</strong> ${r.tipo_servicio}</p>
      <p><strong>Dirección:</strong> ${r.direccion} #${r.numero_exterior}</p>
      <p><strong>Colonia:</strong> ${r.colonia}</p>
      <p><strong>Fecha:</strong> ${r.fecha.split('T')[0]}</p>
      ${r.foto ? `<img src="/uploads/${r.foto}" alt="Foto reporte">` : ''}
      <button onclick="borrarReporte(${r.id})">Eliminar</button>
    `;
    contenedor.appendChild(div);
  });
}

async function borrarReporte(id) {
  const username = prompt('Usuario:');
  const password = prompt('Contraseña:');

  if (!username || !password) return;

  await fetch(`/reportes/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  cargarReportes();
}

function descargarExcel() {
  window.open('/descargarExcel', '_blank');
}

function descargarPDF() {
  window.open('/descargarPDF', '_blank');
}
