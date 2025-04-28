document.addEventListener("DOMContentLoaded", () => {
  const coloniaSelect = document.getElementById('coloniaSelect');
  const formulario = document.getElementById('formulario');
  const tablaReportes = document.getElementById('tablaReportes');

  // Cargar colonias
  fetch('/data/colonias.json')
      .then(response => response.json())
      .then(data => {
          coloniaSelect.innerHTML = '<option value="">Selecciona colonia</option>';
          data.forEach(colonia => {
              const option = document.createElement('option');
              option.value = colonia.nombre;
              option.textContent = colonia.nombre;
              coloniaSelect.appendChild(option);
          });
      });

  // Enviar formulario
  formulario.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(formulario);

      fetch('/reportes', {
          method: 'POST',
          body: formData
      })
      .then(response => {
          if (!response.ok) throw new Error('Error al enviar reporte');
          return response.json();
      })
      .then(data => {
          alert('Reporte agregado');
          formulario.reset();
          cargarReportes();
      })
      .catch(error => {
          alert('Error al subir reporte');
          console.error(error);
      });
  });

  function cargarReportes() {
      fetch('/reportes')
          .then(response => response.json())
          .then(data => {
              let html = `
                  <table border="1">
                      <thead>
                          <tr>
                              <th>Tipo</th><th>Dirección</th><th>Colonia</th><th>Fecha</th><th>Origen</th><th>Folio</th><th>Foto</th><th>Acciones</th>
                          </tr>
                      </thead>
                      <tbody>
              `;
              data.forEach(r => {
                  html += `
                      <tr>
                          <td>${r.tipoServicio}</td>
                          <td>${r.direccion} ${r.numeroExterior}</td>
                          <td>${r.colonia}</td>
                          <td>${r.fecha}</td>
                          <td>${r.origen}</td>
                          <td>${r.folio || ''}</td>
                          <td>${r.foto ? `<img src="/uploads/${r.foto}" width="50">` : ''}</td>
                          <td><!-- Botón de borrar si quieres --></td>
                      </tr>
                  `;
              });
              html += `</tbody></table>`;
              tablaReportes.innerHTML = html;
          });
  }

  cargarReportes();
});
