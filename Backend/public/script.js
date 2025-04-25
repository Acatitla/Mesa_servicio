document.addEventListener('DOMContentLoaded', () => {
  // Cargar reportes al iniciar
  fetchReportes();

  // Filtros
  const filtroColonia = document.getElementById('filtroColonia');
  const filtroFecha = document.getElementById('filtroFecha');
  const btnFiltrar = document.getElementById('btnFiltrar');

  btnFiltrar.addEventListener('click', () => {
    const colonia = filtroColonia.value;
    const fecha = filtroFecha.value;
    fetchReportes(colonia, fecha);
  });

  // Función para obtener reportes con filtros
  function fetchReportes(colonia = '', fecha = '') {
    const url = `/filtrar-reportes?colonia=${colonia}&fecha=${fecha}`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        const reportesContainer = document.getElementById('reportesContainer');
        reportesContainer.innerHTML = ''; // Limpiar reportes existentes

        data.forEach(reporte => {
          const reporteDiv = document.createElement('div');
          reporteDiv.classList.add('reporte');
          reporteDiv.innerHTML = `
            <div>
              <strong>Servicio:</strong> ${reporte.servicio} <br>
              <strong>Folio:</strong> ${reporte.folio} <br>
              <strong>Colonia:</strong> ${reporte.colonia} <br>
              <strong>Dirección:</strong> ${reporte.direccion} <br>
              <strong>Fecha:</strong> ${reporte.fecha} <br>
              <strong>Descripción:</strong> ${reporte.descripcion} <br>
              ${reporte.imagen ? `<img src="/uploads/${reporte.imagen}" alt="Imagen reporte" width="100">` : ''}
              <button onclick="eliminarReporte(${reporte.id})">Eliminar</button>
            </div>
          `;
          reportesContainer.appendChild(reporteDiv);
        });
      })
      .catch(err => console.error('Error al cargar los reportes:', err));
  }

  // Función para eliminar reporte
  window.eliminarReporte = (id) => {
    const usuario = prompt('Ingrese el usuario:');
    const contrasena = prompt('Ingrese la contraseña:');

    if (usuario === 'oro4' && contrasena === 'luminarias') {
      fetch('/eliminar-reporte', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, usuario, contrasena }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.mensaje) {
            alert(data.mensaje);
            fetchReportes(); // Recargar reportes después de eliminar
          } else {
            alert('No se pudo eliminar el reporte');
          }
        })
        .catch(err => console.error('Error al eliminar el reporte:', err));
    } else {
      alert('Credenciales incorrectas');
    }
  }
});
