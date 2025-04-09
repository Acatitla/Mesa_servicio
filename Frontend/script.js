document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formulario');
    const reportesDiv = document.getElementById('reportes');
    const modal = document.getElementById('modalLogin');
    const cerrarModal = document.getElementById('cerrarModal');
    const loginBtn = document.getElementById('loginBtn');
    let idReporteAEliminar = null;
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      try {
        const res = await fetch('http://localhost:3000/reportes', {
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
      const res = await fetch('http://localhost:3000/reportes');
      const reportes = await res.json();
      reportesDiv.innerHTML = '';
      reportes.forEach(rep => {
        const div = document.createElement('div');
        div.className = 'reporte';
        div.innerHTML = `
          <strong>${rep.tipo_servicio}</strong><br>
          <small>${rep.fecha}</small><br>
          Dirección: ${rep.calle} ${rep.no_exterior || ''}, ${rep.colonia}<br>
          Solicitante: ${rep.solicitante}<br>
          ${rep.foto ? `<img src="http://localhost:3000/uploads/${rep.foto}" />` : ''}
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

    document.addEventListener("DOMContentLoaded", function () {
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
        toggleFolioField(); // ejecuta al cargar por si ya hay una opción seleccionada
      });

  
    loginBtn.onclick = async () => {
      const usuario = document.getElementById('usuario').value;
      const contrasena = document.getElementById('contrasena').value;
      if (!idReporteAEliminar) return;
  
      const res = await fetch('http://localhost:3000/eliminar', {
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
  
    cargarReportes();
  });
  