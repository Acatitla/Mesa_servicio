document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatosFormulario();
  await cargarReportes();

  // Configurar eventos
  document.getElementById('formulario').addEventListener('submit', agregarReporte);
  document.getElementById('descargarExcel').addEventListener('click', descargarExcel);

  // Configurar fecha mínima como hoy
  const fechaInput = document.getElementById('fecha');
  if (fechaInput) {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - timezoneOffset).toISOString().slice(0, 16);
    fechaInput.min = localISOTime;
  }
});

async function cargarDatosFormulario() {
  try {
    const response = await fetch('/form-data');
    if (!response.ok) throw new Error('Error al cargar datos del formulario');

    const data = await response.json();

    // Cargar colonias
    const coloniaSelect = document.getElementById('colonia');
    coloniaSelect.innerHTML = '<option value="" disabled selected>Seleccione una colonia...</option>';
    data.colonias.forEach(c => {
      const option = document.createElement('option');
      option.value = c.nombre || c;
      option.textContent = c.nombre || c;
      coloniaSelect.appendChild(option);
    });

    // Cargar tipos de servicio
    const tipoServicioSelect = document.getElementById('tipoServicio');
    tipoServicioSelect.innerHTML = '<option value="" disabled selected>Seleccione un tipo...</option>';
    data.tipos_servicio.forEach(t => {
      const option = document.createElement('option');
      option.value = t;
      option.textContent = t;
      tipoServicioSelect.appendChild(option);
    });

    // Cargar orígenes
    const origenSelect = document.getElementById('origen');
    origenSelect.innerHTML = '<option value="" disabled selected>Seleccione un origen...</option>';
    data.origenes.forEach(o => {
      const option = document.createElement('option');
      option.value = o;
      option.textContent = o;
      origenSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando datos del formulario:', error);
    mostrarAlerta('Error al cargar datos del formulario', 'error');
  }
}

async function agregarReporte(e) {
  e.preventDefault();
  const form = document.getElementById('formulario');
  const submitBtn = form.querySelector('button[type="submit"]');

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const formData = new FormData(form);

    // Validar campos requeridos
    const camposRequeridos = ['origen', 'solicitante', 'colonia', 'direccion', 'tipoServicio', 'fecha'];
    const faltantes = camposRequeridos.filter(campo => !formData.get(campo));

    if (faltantes.length > 0) {
      throw new Error(`Faltan campos obligatorios: ${faltantes.join(', ')}`);
    }

    // Formatear fecha correctamente
    const fechaInput = form.querySelector('#fecha');
    if (fechaInput.value) {
      const fecha = new Date(fechaInput.value);
      formData.set('fecha', fecha.toISOString());
    }

    const response = await fetch('/reportes', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al guardar reporte');
    }

    form.reset();
    await cargarReportes();
    mostrarAlerta('Reporte guardado correctamente', 'success');
  } catch (error) {
    console.error('Error al guardar reporte:', error);
    mostrarAlerta(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Agregar Reporte';
  }
}

async function cargarReportes() {
  const contenedor = document.getElementById('reportes');

  try {
    contenedor.innerHTML = '<div class="loading">Cargando reportes...</div>';

    const response = await fetch('/reportes');
    if (!response.ok) {
      throw new Error('Error al cargar reportes');
    }

    const data = await response.json();

    if (data.length === 0) {
      contenedor.innerHTML = '<div class="no-data">No hay reportes registrados</div>';
      return;
    }

    contenedor.innerHTML = '';
    data.forEach(reporte => {
      const div = document.createElement('div');
      div.className = 'reporte';
      div.innerHTML = `
        <div class="reporte-header">
          <h3>${reporte.tipo_servicio}</h3>
          <span class="fecha">${formatearFecha(reporte.fecha)}</span>
        </div>
        <div class="reporte-body">
          <p><strong>Solicitante:</strong> ${reporte.solicitante}</p>
          <p><strong>Origen:</strong> ${reporte.origen}</p>
          ${reporte.folio ? `<p><strong>Folio:</strong> ${reporte.folio}</p>` : ''}
          <p><strong>Dirección:</strong> ${reporte.direccion} ${reporte.numero_exterior ? `#${reporte.numero_exterior}` : ''}</p>
          <p><strong>Colonia:</strong> ${reporte.colonia}</p>
          ${reporte.telefono ? `<p><strong>Teléfono:</strong> ${reporte.telefono}</p>` : ''}
          ${reporte.referencias ? `<p><strong>Referencias:</strong> ${reporte.referencias}</p>` : ''}
        </div>
        <div class="reporte-footer">
          ${reporte.foto ? `<img src="/uploads/${reporte.foto}" alt="Foto del reporte" class="reporte-foto">` : ''}
          <div class="reporte-acciones">
            <button onclick="borrarReporte(${reporte.id})" class="btn-eliminar">
              <i class="fas fa-trash"></i> Eliminar
            </button>
            <a href="/descargarPDF/${reporte.id}" target="_blank" class="btn-pdf">
              <i class="fas fa-file-pdf"></i> PDF
            </a>
          </div>
        </div>
      `;
      contenedor.appendChild(div);
    });
  } catch (error) {
    console.error('Error al cargar reportes:', error);
    contenedor.innerHTML = `
      <div class="error">
        <p>${error.message}</p>
        <button onclick="cargarReportes()" class="btn-reintentar">
          <i class="fas fa-sync-alt"></i> Reintentar
        </button>
      </div>
    `;
  }
}

async function borrarReporte(id) {
  if (!confirm('¿Estás seguro de eliminar este reporte?')) return;

  const username = prompt('Usuario administrador:');
  const password = prompt('Contraseña:');

  if (!username || !password) {
    mostrarAlerta('Se requieren credenciales para eliminar', 'error');
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al eliminar reporte');
    }

    await cargarReportes();
    mostrarAlerta('Reporte eliminado correctamente', 'success');
  } catch (error) {
    console.error('Error al borrar reporte:', error);
    mostrarAlerta(error.message, 'error');
  }
}

function descargarExcel() {
  window.open('/descargarExcel', '_blank');
}

function formatearFecha(fechaString) {
  const fecha = new Date(fechaString);
  return fecha.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function mostrarAlerta(mensaje, tipo = 'info') {
  const alerta = document.createElement('div');
  alerta.className = `alerta alerta-${tipo}`;
  alerta.innerHTML = `
    <span>${mensaje}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;

  document.body.appendChild(alerta);

  setTimeout(() => {
    alerta.classList.add('alerta-salida');
    setTimeout(() => alerta.remove(), 300);
  }, 5000);
}
