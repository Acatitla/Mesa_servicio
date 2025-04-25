document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = ''; // si estás en local, lo dejamos vacío
  const form = document.getElementById('formulario');
  const reportesDiv = document.getElementById('reportes');
  const modal = document.getElementById('modalLogin');
  const cerrarModal = document.getElementById('cerrarModal');
  const loginBtn = document.getElementById('loginBtn');
  let idReporteAEliminar = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const calle = formData.get('calle') || '';
    const numero = formData.get('no_exterior') || '';
    const referencias = formData.get('referencias') || '';
    const direccion = `${calle} ${numero}, Ref: ${referencias}`.trim();
    formData.append('direccion', direccion);

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
    try {
      const res = await fetch(`${API_BASE}/reportes`);
      const reportes = await res.json();
      reportesDiv.innerHTML = '';

      reportes.forEach(rep => {
        const div = document.createElement('div');
        div.className = 'reporte';
        div.innerHTML = `
          <strong>${rep.tipo_servicio || rep.tipo}</strong><br>
          <small>${rep.fecha}</small><br>
          Dirección: ${rep.direccion || 'N/A'}<br>
          Solicitante: ${rep.solicitante || ''}<br>
          ${rep.foto ? `<img src="/uploads/${rep.foto}" width="100">` : ''}
          <br>
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
    } catch (err) {
      console.error('Error al cargar los reportes:', err);
      alert('Error al cargar los reportes');
    }
  }

  cerrarModal.onclick = () => {
    modal.style.display = 'none';
  };

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

  window.descargarPDF = function () {
    const id = document.getElementById('pdf-id').value;
    if (!id) return alert('Ingresa un ID válido');
    window.location.href = `${API_BASE}/reporte/${id}/pdf`;
  };

  window.descargarExcel = function () {
    const fecha = document.getElementById('fecha-excel').value;
    const colonia = document.getElementById('colonia-excel').value;
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (colonia) params.append('colonia', colonia);
    window.location.href = `${API_BASE}/api/excel?${params.toString()}`;
  };

  cargarReportes();
});
