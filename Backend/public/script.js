// public/script.js
document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatosFormulario();
  await cargarReportes();

  document.getElementById('formulario').addEventListener('submit', agregarReporte);
  document.getElementById('descargarExcel').addEventListener('click', descargarExcel);
});

async function cargarDatosFormulario() {
  try {
    const res = await fetch('/form-data');
    const data = await res.json();
    
    // Cargar colonias
    const coloniaSelect = document.getElementById('colonia');
    data.colonias.forEach(c => {
      const option = document.createElement('option');
      option.value = c.nombre || c; // Compatibilidad con diferentes formatos de JSON
      option.textContent = c.nombre || c;
      coloniaSelect.appendChild(option);
    });
    
    // Cargar tipos de servicio
    const tipoServicioSelect = document.getElementById('tipoServicio');
    data.tiposServicio.forEach(t => {
      const option = document.createElement('option');
      option.value = t;
      option.textContent = t;
      tipoServicioSelect.appendChild(option);
    });
    
    // Cargar orígenes
    const origenSelect = document.getElementById('origen');
    data.origenes.forEach(o => {
      const option = document.createElement('option');
      option.value = o;
      option.textContent = o;
      origenSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando datos del formulario:', error);
    alert('Error al cargar datos del formulario');
  }
}

async function agregarReporte(e) {
  e.preventDefault();
  const form = document.getElementById('formulario');
  const formData = new FormData(form);

  try {
    const response = await fetch('/reportes', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar reporte');
    }

    form.reset();
    await cargarReportes();
    alert('Reporte guardado correctamente');
  } catch (error) {
    console.error('Error al guardar reporte:', error);
    alert(error.message);
  }
}

async function cargarReportes() {
  try {
    const res = await fetch('/reportes');
    if (!res.ok) throw new Error('Error al cargar reportes');
    
    const reportes = await res.json();
    const contenedor = document.getElementById('reportes');
    contenedor.innerHTML = '';

    if (reportes.length === 0) {
      contenedor.innerHTML = '<p>No hay reportes registrados</p>';
      return;
    }

    reportes.forEach(r => {
      const div = document.createElement('div');
      div.classList.add('reporte');
      div.innerHTML = `
        <div class="reporte-header">
          <h3>${r.tipo_servicio} - ${formatFecha(r.fecha)}</h3>
          <span class="folio">${r.folio ? `Folio: ${r.folio}` : 'Sin folio'}</span>
        </div>
        <div class="reporte-body">
          <p><strong>Solicitante:</strong> ${r.solicitante}</p>
          <p><strong>Dirección:</strong> ${r.direccion} ${r.numero_exterior ? `#${r.numero_exterior}` : ''}</p>
          <p><strong>Colonia:</strong> ${r.colonia}</p>
          <p><strong>Origen:</strong> ${r.origen}</p>
          <p><strong>Teléfono:</strong> ${r.telefono || 'No especificado'}</p>
          ${r.referencias ? `<p><strong>Referencias:</strong> ${r.referencias}</p>` : ''}
        </div>
        <div class="reporte-footer">
          ${r.foto ? `<img src="/uploads/${r.foto}" alt="Foto reporte" class="reporte-foto">` : ''}
          <button onclick="borrarReporte(${r.id})" class="btn-eliminar">Eliminar</button>
          <a href="/descargarPDF/${r.id}" target="_blank" class="btn-pdf">Descargar PDF</a>
        </div>
      `;
      contenedor.appendChild(div);
    });
  } catch (error) {
    console.error('Error al cargar reportes:', error);
    document.getElementById('reportes').innerHTML = `<p class="error">${error.message}</p>`;
  }
}

async function borrarReporte(id) {
  if (!confirm('¿Estás seguro de eliminar este reporte?')) return;

  const username = prompt('Usuario:');
  const password = prompt('Contraseña:');

  if (!username || !password) {
    alert('Se requieren credenciales para eliminar');
    return;
  }

  try {
    const response = await fetch(`/reportes/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar reporte');
    }

    await cargarReportes();
    alert('Reporte eliminado correctamente');
  } catch (error) {
    console.error('Error al borrar reporte:', error);
    alert(error.message);
  }
}

function descargarExcel() {
  window.open('/descargarExcel', '_blank');
}

function formatFecha(fechaString) {
  const fecha = new Date(fechaString);
  return fecha.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}