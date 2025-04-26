document.addEventListener('DOMContentLoaded', () => {
  // Cargar reportes al iniciar
  fetchReportes();

  // Filtros
  const filtroColonia = document.getElementById('filtroColonia');
  const filtroFecha = document.getElementById('filtroFecha');
  const btnFiltrar = document.getElementById('btnFiltrar');

  btnFiltrar.addEventListener('click', () => {
    const colonia = filtroColonia.value;
    const fecha =// Mostrar el campo de folio si el origen es Oficio o DMU
    function mostrarFolio() {
        const origen = document.getElementById('origen').value;
        const campoFolio = document.getElementById('campoFolio');
        if (origen === 'Oficio' || origen === 'DMU') {
            campoFolio.style.display = 'block';
        } else {
            campoFolio.style.display = 'none';
        }
    }
    
    // Cargar todos los reportes al inicio
    async function cargarReportes() {
        try {
            const response = await fetch('/reportes');
            const reportes = await response.json();
            mostrarReportes(reportes);
        } catch (error) {
            console.error('Error al cargar reportes:', error);
        }
    }
    
    // Mostrar los reportes en la tabla
    function mostrarReportes(reportes) {
        const tbody = document.querySelector('#tablaReportes tbody');
        tbody.innerHTML = '';
    
        reportes.forEach(reporte => {
            const tr = document.createElement('tr');
    
            tr.innerHTML = `
                <td>${reporte.tipo}</td>
                <td>${reporte.calle} ${reporte.no_exterior || ''} ${reporte.referencias || ''}</td>
                <td>${reporte.colonia}</td>
                <td>${reporte.fecha}</td>
                <td>${reporte.origen}</td>
                <td>${reporte.folio || ''}</td>
                <td>${reporte.foto ? `<img src="${reporte.foto}" style="width:100px;">` : 'Sin foto'}</td>
                <td><button onclick="eliminarReporte(${reporte.id})">Eliminar</button></td>
            `;
    
            tbody.appendChild(tr);
        });
    }
    
    // Eliminar un reporte (requiere autenticación)
    async function eliminarReporte(id) {
        const usuario = prompt('Usuario:');
        const password = prompt('Contraseña:');
    
        if (!usuario || !password) {
            alert('Debes ingresar usuario y contraseña');
            return;
        }
    
        try {
            const response = await fetch(`/reportes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario, password })
            });
    
            const data = await response.json();
            alert(data.message || 'Eliminado');
    
            cargarReportes();
        } catch (error) {
            console.error('Error al eliminar reporte:', error);
        }
    }
    
    // Filtrar reportes por fecha o colonia
    async function filtrarReportes() {
        const fecha = document.getElementById('filtroFecha').value;
        const colonia = document.getElementById('filtroColonia').value;
    
        let url = '/reportes';
        const params = [];
    
        if (fecha) params.push(`fecha=${fecha}`);
        if (colonia) params.push(`colonia=${encodeURIComponent(colonia)}`);
    
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
    
        try {
            const response = await fetch(url);
            const reportes = await response.json();
            mostrarReportes(reportes);
        } catch (error) {
            console.error('Error al filtrar reportes:', error);
        }
    }
    
    // Descargar los reportes filtrados en Excel
    async function descargarExcel() {
        const fecha = document.getElementById('filtroFecha').value;
        const colonia = document.getElementById('filtroColonia').value;
    
        let url = '/descargarExcel';
        const params = [];
    
        if (fecha) params.push(`fecha=${fecha}`);
        if (colonia) params.push(`colonia=${encodeURIComponent(colonia)}`);
    
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
    
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = 'reportes.xlsx';
            link.click();
        } catch (error) {
            console.error('Error al descargar Excel:', error);
        }
    }
    
    // Cargar los reportes automáticamente al entrar a la página
    window.onload = cargarReportes;
     filtroFecha.value;
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

  // Función para cargar las colonias desde el archivo JSON
  async function cargarColonias() {
    try {
      const response = await fetch('data/colonias.json');  // Asegúrate de que la ruta sea correcta
      const colonias = await response.json();  // Parseamos el JSON

      const coloniaSelect = document.getElementById("colonia-select");
      const filtroColonia = document.getElementById("filtro-colonia");

      // Agregar opciones al select de colonias
      colonias.forEach(colonia => {
        const option = document.createElement("option");
        option.value = colonia;
        option.textContent = colonia;
        coloniaSelect.appendChild(option);

        // Agregar opciones al filtro de colonias
        const filtroOption = document.createElement("option");
        filtroOption.value = colonia;
        filtroOption.textContent = colonia;
        filtroColonia.appendChild(filtroOption);
      });
    } catch (error) {
      console.error("Error al cargar las colonias:", error);
    }
  }

  // Llamar la función cuando se carga la página
  cargarColonias();
});
