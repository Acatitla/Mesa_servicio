document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://mesa-servicio.onrender.com';

  const form = document.getElementById('formulario');
  const reportesDiv = document.getElementById('reportes');
  const modal = document.getElementById('modalLogin');
  const cerrarModal = document.getElementById('cerrarModal');
  const loginBtn = document.getElementById('loginBtn');
  let idReporteAEliminar = null;

  // Cargar las colonias del archivo JSON
  async function cargarColonias() {
    const res = await fetch('/Backend/data/colonias.json');
    const colonias = await res.json();
    const coloniaSelect = document.getElementById('colonia');

    colonias.forEach(colonia => {
      const option = document.createElement('option');
      option.value = colonia;
      option.textContent = colonia;
      coloniaSelect.appendChild(option);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    // Crear "direccion" uniendo calle + no_exterior + referencias
    const calle = formData.get('calle') || '';
    const numero = formData.get('no_exterior') || '';
    const referencias = formData.get('referencias') || '';
    const direccion = `${calle} ${numero}, Ref: ${referencias}`.trim();
    formData.append('direccion', direccion);

    // Agregar la fecha actual (formato YYYY-MM-DD)
    const hoy = new Date().toISOString().split('T')[0];
    formData.append('fecha', hoy);

    // Si el campo de folio está visible, lo agregamos manualmente
    const folioInput = document.getElementById('folio');
    if (folioContainer.style.display !== 'none' && folioInput.value) {
      formData.set('folio', folioInput.value);
    }

    console.log('Direccion:', direccion);

    try {
      const res = await fetch(`${API_BASE}/reportes`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert('Reporte guardado');
        form.reset();
        cargarReportes();
      } else {
        alert(data.error || 'Error al guardar');
      }
    } catch (err) {
      alert('Error al conectar con el servidor');
    }
  });

  async function cargarReportes() {
    const res = await fetch(`${API_BASE}/reportes`);
    const reportes = await res.json();
    reportesDiv.innerHTML = '';
    reportes.forEach(rep => {
      const div = document.createElement('div');
      div.className = 'reporte';
      div.innerHTML = `
        <strong>${rep.tipo_servicio}</strong><br>
        <small>${rep.fecha}</small><br>
        Dirección: ${rep.direccion || 'N/A'}<br>
        Solicitante: ${rep.solicitante}<br>
        ${rep.foto ? `<img src="${API_BASE}/uploads/${rep.foto}" />` : ''}
        <button class="eliminar" data-id="${rep.id}">Eliminar</button>
      `;
      reportesDiv.appendChild(div);
    });

    document.querySelectorAll('.eliminar').forEach(btn => {
      btn.addEventListener('click', () => {
        idReporteAEliminar = btn.getAttribute('data-id');
        modal.style.display = 'block';
      });
    });
  }

  cerrarModal.onclick = () => {
    modal.style.display = 'none';
  };

  // Mostrar campo folio si se selecciona "officio" o "dmu"
  const origenSelect = document.getElementById("origen");
  const folioContainer = document.getElementById("folio-container");

  function toggleFolioField() {
    const selectedValue = origenSelect.value;
    if (selectedValue === "officio" || selectedValue === "dmu") {
      folioContainer.style.display = "block";
    } else {
      folioContainer.style.display = "none";
    }
  }

  origenSelect.addEventListener("change", toggleFolioField);
  toggleFolioField();

  loginBtn.onclick = async () => {
    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    if (!idReporteAEliminar) return;

    const res = await fetch(`${API_BASE}/eliminar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contrasena, id: idReporteAEliminar })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Reporte eliminado');
      modal.style.display = 'none';
      cargarReportes();
    } else {
      alert(data.error || 'Error de autenticación');
    }
  };

  // Exportar PDF individual
  window.descargarPDF = function () {
    const id = document.getElementById('pdf-id').value;
    if (!id) return alert('Ingresa un ID válido');
    window.location.href = `${API_BASE}/reporte/${id}/pdf`;
  };

  // Exportar Excel filtrado
  window.descargarExcel = function () {
    const fecha = document.getElementById('fecha-excel').value;
    const colonia = document.getElementById('colonia-excel').value;
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (colonia) params.append('colonia', colonia);
    window.location.href = `${API_BASE}/api/excel?${params.toString()}`;
  };

  cargarReportes();
  cargarColonias();  // Llamada para cargar las colonias cuando se carga el script
});
