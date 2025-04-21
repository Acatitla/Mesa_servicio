document.addEventListener('DOMContentLoaded', () => {
  const origenSelect = document.getElementById('origen');
  const folioField = document.getElementById('folioField');
  const exportarBtn = document.getElementById('btnExportar');
  const filtroFecha = document.getElementById('filtroFecha');
  const filtroColonia = document.getElementById('filtroColonia');

  // Mostrar campo folio si se selecciona "officio" o "dmu"
  if (origenSelect && folioField) {
    origenSelect.addEventListener('change', () => {
      const valor = origenSelect.value.toLowerCase();
      folioField.style.display = (valor === 'officio' || valor === 'dmu') ? 'block' : 'none';
    });
  }

  // Exportar a Excel por fecha o colonia
  if (exportarBtn) {
    exportarBtn.addEventListener('click', () => {
      const fecha = filtroFecha?.value;
      const colonia = filtroColonia?.value;

      const url = new URL('/api/excel', window.location.origin);
      if (fecha) url.searchParams.append('fecha', fecha);
      if (colonia) url.searchParams.append('colonia', colonia);

      window.location.href = url.toString();
    });
  }

  // Mostrar miniaturas de las fotos
  const imagenes = document.querySelectorAll('.reporte-img');
  imagenes.forEach(img => {
    img.style.maxWidth = '100px';
    img.style.maxHeight = '100px';
    img.style.borderRadius = '4px';
    img.style.objectFit = 'cover';
    img.style.marginTop = '5px';
  });

  // Centrar los botones del formulario
  const formButtons = document.querySelectorAll('.form-buttons');
  formButtons.forEach(div => {
    div.style.display = 'flex';
    div.style.justifyContent = 'center';
    div.style.gap = '10px';
    div.style.marginTop = '15px';
  });

});
