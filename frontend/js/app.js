/* ==========================================================================
   1. CONTROL PRINCIPAL Y SELECCIÓN AL CARGAR EL DOM
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const formulario = document.getElementById('filter-form');
  const contenedorRecetas = document.getElementById('recipes-container');
  const txtGasto = document.getElementById('total-cost');
  const txtAhorro = document.getElementById('total-savings');
  const btnLimpiar = document.getElementById('btn-clear');
  const txtConversionEdad = document.getElementById('age-conversion');
  const inputEdad = document.getElementById('age');

  const getFormatoAlimentacion = () => {
    const elemento = document.getElementById('format');
    return elemento ? elemento.value : 'Mixto';
  };

  /* ==========================================================================
     1B. CONVERTIDOR DE EDAD EN TIEMPO REAL 
     ========================================================================== */
  function calcularConversionEdad(mesesTotales) {
    if (isNaN(mesesTotales) || mesesTotales < 6) {
      if (txtConversionEdad) txtConversionEdad.textContent = '';
      return;
    }
    const anos = Math.floor(mesesTotales / 12);
    const mesesRestantes = mesesTotales % 12;

    if (mesesTotales < 12) {
      txtConversionEdad.textContent = `👶 Etapa de lactancia: ${mesesTotales} meses`;
    } else {
      let mensaje = `✨ Equivale a ${anos} ${anos === 1 ? 'año' : 'años'}`;
      if (mesesRestantes > 0) mensaje += ` y ${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'}`;
      txtConversionEdad.textContent = mensaje;
    }
  }

  if (inputEdad) {
    inputEdad.addEventListener('input', (e) => calcularConversionEdad(parseInt(e.target.value)));
  }

  /* ==========================================================================
     2. MANEJADORES PARA LA BARRA DE NAVEGACIÓN SUPERIOR
     ========================================================================== */
  const btnNavMenu = document.getElementById('btn-nav-menu');
  const btnNavCompras = document.getElementById('btn-nav-compras');
  const btnNavVolver = document.getElementById('btn-nav-volver');

  if (btnNavMenu && btnNavCompras && btnNavVolver) {
    btnNavMenu.addEventListener('click', () => cambiarPasoResultados('menu'));
    btnNavCompras.addEventListener('click', () => cambiarPasoResultados('compras'));
    btnNavVolver.addEventListener('click', () => volverAlFormulario());
  }

  /* ==========================================================================
     3. ENVÍO DEL FORMULARIO Y PETICIÓN AL BACKEND
     ========================================================================== */
  if (formulario) {
    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();

      const loader = document.getElementById('loader-pantalla');
      const vistaForm = document.getElementById('vista-paso1');

      const edadMeses = parseInt(document.getElementById('age').value);
      const sexoBiologico = document.getElementById('gender').value;
      const pesoKg = parseFloat(document.getElementById('weight').value);
      const tallaCm = parseFloat(document.getElementById('height').value);
      const presupuestoMaximoCLP = parseInt(document.getElementById('budget').value);
      const alergias = Array.from(document.querySelectorAll('input[name="allergens"]:checked')).map(cb => cb.value);
      const mercaderiaEnCasa = Array.from(document.querySelectorAll('input[name="despensa"]:checked')).map(el => el.value);

      const datosBebe = { edadMeses, sexoBiologico, pesoKg, tallaCm, alergias, presupuestoMaximoCLP, formatoAlimentacion: getFormatoAlimentacion() };

      try {
        vistaForm.classList.add('hidden');
        if (loader) loader.classList.remove('hidden');

        const respuesta = await fetch('https://menu-bebe-api.onrender.com/api/menu-personalizado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...datosBebe, mercaderiaEnCasa })
        });

        const resultado = await respuesta.json();
        if (loader) loader.classList.add('hidden');

        if (respuesta.ok) {
          localStorage.setItem('nutribebe_datos', JSON.stringify(datosBebe));
          
          dibujarMenuEnPantalla(resultado, contenedorRecetas, txtGasto, txtAhorro);
          
          if (resultado.finanzasSupermercados) {
            mostrarFinanzasYCompras(resultado.finanzasSupermercados);
          }

          document.getElementById('navegacion-resultados').classList.remove('hidden');
          cambiarPasoResultados('menu');
        } else {
          alert(`Error en el cálculo: ${resultado.mensaje}`);
          vistaForm.classList.remove('hidden');
        }
      } catch (err) {
        console.error(err);
        if (loader) loader.classList.add('hidden');
        alert("⚠️ Error crítico de conexión con el backend en Render.");
        vistaForm.classList.remove('hidden');
      }
    });
  }

  /* ==========================================================================
     4. PERSISTENCIA Y RESTAURACIÓN DE DATOS GUARDADOS
     ========================================================================== */
  const datosGuardados = localStorage.getItem('nutribebe_datos');
  if (datosGuardados) {
    const datos = JSON.parse(datosGuardados);
    if (document.getElementById('age') && datos.edadMeses) {
      document.getElementById('age').value = datos.edadMeses;
      calcularConversionEdad(parseInt(datos.edadMeses));
    }
    if (document.getElementById('gender') && datos.sexoBiologico) document.getElementById('gender').value = datos.sexoBiologico;
    if (document.getElementById('format') && datos.formatoAlimentacion) document.getElementById('format').value = datos.formatoAlimentacion;
    if (document.getElementById('weight') && datos.pesoKg) document.getElementById('weight').value = datos.pesoKg;
    if (document.getElementById('height') && datos.tallaCm) document.getElementById('height').value = datos.tallaCm;
    if (document.getElementById('budget') && datos.presupuestoMaximoCLP) document.getElementById('budget').value = datos.presupuestoMaximoCLP;
  }

  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      formulario.reset();
      localStorage.removeItem('nutribebe_datos');
      if (txtConversionEdad) txtConversionEdad.textContent = '';
      volverAlFormulario();
    });
  }
});

/* ==========================================================================
   5. FUNCIONES AUXILIARES DE NAVEGACIÓN
   ========================================================================== */
function cambiarPasoResultados(objetivo) {
  const vistaMenu = document.getElementById('vista-paso2');
  const vistaCompras = document.getElementById('vista-paso3');
  const btnMenu = document.getElementById('btn-nav-menu');
  const btnCompras = document.getElementById('btn-nav-compras');

  if (objetivo === 'menu') {
    if (vistaMenu) vistaMenu.classList.remove('hidden');
    if (vistaCompras) vistaCompras.classList.add('hidden');
    if (btnMenu) btnMenu.classList.add('active');
    if (btnCompras) btnCompras.classList.remove('active');
  } else {
    if (vistaMenu) vistaMenu.classList.add('hidden');
    if (vistaCompras) vistaCompras.classList.remove('hidden');
    if (btnMenu) btnMenu.classList.remove('active');
    if (btnCompras) btnCompras.classList.add('active');
  }
}

function volverAlFormulario() {
  const v1 = document.getElementById('vista-paso1');
  const nav = document.getElementById('navegacion-resultados');
  const v2 = document.getElementById('vista-paso2');
  const v3 = document.getElementById('vista-paso3');

  if (v1) v1.classList.remove('hidden');
  if (nav) nav.classList.add('hidden');
  if (v2) v2.classList.add('hidden');
  if (v3) v3.classList.add('hidden');
}

/* ==========================================================================
   6. GESTIÓN CONTROLADORA DEL MODAL EMERGENTE (POPUP)
   ========================================================================== */
function abrirDetalleRecetaModal(receta, subCatTitulo) {
  const modal = document.getElementById('recipe-modal');
  const contenedorContenido = document.getElementById('modal-body-content');
  if (!modal || !contenedorContenido) return;

  if (!receta) {
    contenedorContenido.innerHTML = `<p style="color:#64748b; text-align:center;">No hay detalles adicionales disponibles.</p>`;
    modal.style.display = 'flex';
    return;
  }

  const formatoTexto = receta.formato || 'No especificado';
  const colorBadge = subCatTitulo.includes('Almuerzo') ? 'background: #e8f8f0; color: #27ae60;' : 'background: #fff3cd; color: #856404;';

  const listaIngredientes = receta.ingredientes && receta.ingredientes.length > 0
    ? receta.ingredientes.map(i => `<li style="padding: 7px 0; border-bottom: 1px dashed #f1f5f9; font-size:0.95rem; color:#334155;">• <strong>${i.cantidad}</strong> de ${i.nombre}</li>`).join('')
    : '<li style="color:#94a3b8; font-style: italic;">No requiere ingredientes extras complejos.</li>';

  let preparacionHTML = '';
  if (receta.pasos && receta.pasos.length > 0) {
    preparacionHTML = receta.pasos.map((paso, index) => `<p style="margin: 6px 0; font-size:0.95rem; line-height:1.5; color:#475569;"><strong>${index + 1}.</strong> ${paso}</p>`).join('');
  } else {
    preparacionHTML = `<p style="color:#94a3b8; font-style: italic; font-size:0.95rem;">🥣 Preparación hogareña estándar. Servir respetando la consistencia recomendada para formato ${formatoTexto}.</p>`;
  }

  contenedorContenido.innerHTML = `
    <div style="text-align: center; margin-bottom: 15px;">
      <span style="font-size: 0.8rem; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; color: #94a3b8;">${subCatTitulo}</span>
      <h2 style="color: #1e293b; margin: 5px 0 10px 0; font-size: 1.4rem; font-weight: 700;">${receta.nombre}</h2>
      <span style="display: inline-block; ${colorBadge} padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold;">Formato: ${formatoTexto}</span>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #cbd5e1; padding: 10px 15px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
      <p style="margin:0; font-size: 0.9rem; color: #64748b; font-style: italic; line-height: 1.4; text-align: justify;">"${receta.descripcion}"</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h4 style="color: #1e293b; margin: 0 0 8px 0; font-size: 1rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">📋 Detalle de Alimentos</h4>
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${listaIngredientes}
      </ul>
    </div>

    <div>
      <h4 style="color: #1e293b; margin: 0 0 8px 0; font-size: 1rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">🍳 Preparación</h4>
      <div style="margin-top: 8px;">
        ${preparacionHTML}
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  const btnCerrar = document.getElementById('close-modal');
  if (btnCerrar) {
    btnCerrar.onclick = () => modal.style.display = 'none';
  }
}

/* ==========================================================================
   7. RENDERIZADO DINÁMICO DE COMPONENTES
   ========================================================================== */
function dibujarMenuEnPantalla(datos, contenedorRecetas, txtGasto, txtAhorro) {
  if (!contenedorRecetas) return;
  contenedorRecetas.innerHTML = '';
  
  const informeViejo = document.getElementById('informe-nutricional-dinamico');
  if (informeViejo) informeViejo.remove();

  if (!datos.menuSemanal || Object.keys(datos.menuSemanal).length === 0) return;

  if (datos.infoNutricionalBebe) {
    const infoNutri = datos.infoNutricionalBebe;
    const infoBox = document.createElement('div');
    infoBox.id = 'informe-nutricional-dinamico';
    infoBox.className = 'alert-box-container';
    infoBox.innerHTML = `
      <h3>📊 Informe de Requerimientos Nutricionales</h3>
      <p>Estado del bebé: <strong>${infoNutri.evaluacionBiometrica.estadoNutricional}</strong> (IMC: ${infoNutri.evaluacionBiometrica.imcCalculado})</p>
      <p style="margin-top:5px; font-size:0.9rem;">🎯 Meta: ${infoNutri.caloriasMeta} kcal/día | 💧 Líquidos: ${infoNutri.liquidosMeta} mL/día</p>
    `;
    const v2 = document.getElementById('vista-paso2');
    if (v2) v2.prepend(infoBox);
  }

  if (txtGasto) txtGasto.textContent = `$${(datos.gastoSemanalCalculado || 0).toLocaleString('es-CL')}`;
  if (txtAhorro) txtAhorro.textContent = `$${(datos.dineroAhorradoSemanal || 0).toLocaleString('es-CL')}`;

  const categoriesTipos = ['principales', 'desayunos', 'colaciones', 'postres'];
  const subGrillas = {};

  categoriesTipos.forEach(cat => {
    const grid = document.createElement('div');
    grid.className = `tab-content-view ${cat === 'principales' ? '' : 'hidden'}`;
    grid.id = `grid-view-${cat}`;
    contenedorRecetas.appendChild(grid);
    subGrillas[cat] = grid;
  });

  Object.keys(datos.menuSemanal).forEach(dia => {
    const menuDia = datos.menuSemanal[dia];

    // --- CARD ALMUERZO / CENA ---
    const tarjeta = document.createElement('div');
    tarjeta.className = 'receta-card';
    const almuerzo = menuDia.almuerzo;

    const ingAlmuerzoHTML = almuerzo && almuerzo.ingredientes
      ? almuerzo.ingredientes.map(i => `<li style="font-size:0.85rem; color:#475569; margin-bottom:2px;">• <strong>${i.cantidad}</strong> ${i.nombre}</li>`).join('')
      : '<li style="font-size:0.85rem; color:#94a3b8;">Fruta o acompañamiento simple</li>';

    tarjeta.innerHTML = `
      <div style="padding:12px; background: #f8fafc; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#1e293b; text-align:center;">📅 ${dia.toUpperCase()}</div>
      <div style="padding:15px; display:flex; flex-direction:column; gap:6px;">
        <h4 style="color:#27ae60; margin:0; font-size:0.8rem; text-transform:uppercase; text-align:center;">☀️ Almuerzo / Cena</h4>
        <p style="font-weight:600; color:#334155; font-size:1rem; text-align:center; margin:0;">${almuerzo ? almuerzo.nombre : 'Plato Principal'}</p>
        
        <div style="margin-top: 5px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
          <ul style="list-style:none; padding:0; margin:0;">
            ${ingAlmuerzoHTML}
          </ul>
        </div>
        <span style="font-size:0.7rem; color:#94a3b8; text-align:center; margin-top:5px; display:block;">🔍 Haz clic para ver preparación</span>
      </div>
    `;
    
    if (almuerzo) {
      tarjeta.addEventListener('click', () => abrirDetalleRecetaModal(almuerzo, '☀️ Almuerzo / Cena'));
    }
    if (subGrillas['principales']) subGrillas['principales'].appendChild(tarjeta);
    
    // --- SUBCATEGORÍAS DINÁMICAS (Desayunos, Colaciones, Postres) ---
    ['desayuno', 'colacionTarde', 'postre'].forEach(subCat => {
      const filaTab = document.createElement('div');
      filaTab.className = 'receta-card';
      const itemComida = menuDia[subCat];
      const destino = subCat === 'desayuno' ? 'desayunos' : subCat === 'colacionTarde' ? 'colaciones' : 'postres';
      const tituloSeccion = subCat === 'desayuno' ? '🥞 Desayuno' : subCat === 'colacionTarde' ? '🍎 Colación' : '🍓 Postre';
      
      const ingSubHTML = itemComida && itemComida.ingredientes
        ? itemComida.ingredientes.map(i => `<li style="font-size:0.85rem; color:#475569; margin-bottom:2px;">• <strong>${i.cantidad}</strong> ${i.nombre}</li>`).join('')
        : '<li style="font-size:0.85rem; color:#94a3b8;">Porción natural recomendada</li>';

      filaTab.innerHTML = `
        <div style="padding:12px; background: #f8fafc; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#1e293b; text-align:center;">📅 ${dia.toUpperCase()}</div>
        <div style="padding:15px; display:flex; flex-direction:column; gap:6px;">
          <h4 style="color:var(--color-secundario); margin:0; font-size:0.8rem; text-transform:uppercase; text-align:center;">${tituloSeccion}</h4>
          <p style="font-weight:600; color:#334155; font-size:1rem; text-align:center; margin:0;">${itemComida ? itemComida.nombre : 'Sugerencia de la estación'}</p>
          
          <div style="margin-top: 5px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
            <ul style="list-style:none; padding:0; margin:0;">
              ${ingSubHTML}
            </ul>
          </div>
          ${itemComida ? `<span style="font-size:0.7rem; color:#94a3b8; text-align:center; margin-top:5px; display:block;">🔍 Haz clic para ver preparación</span>` : ''}
        </div>
      `;

      if (itemComida) {
        filaTab.addEventListener('click', () => abrirDetalleRecetaModal(itemComida, tituloSeccion));
      }
      if (subGrillas[destino]) subGrillas[destino].appendChild(filaTab);
    });
  });

  // Listener Pestañas
  const botonesTabs = document.querySelectorAll('.tab-btn');
  botonesTabs.forEach(boton => {
    boton.addEventListener('click', () => {
      botonesTabs.forEach(b => b.classList.remove('active'));
      boton.classList.add('active');
      document.querySelectorAll('.tab-content-view').forEach(v => v.classList.add('hidden'));
      const vistaObjetivo = document.getElementById(`grid-view-${boton.getAttribute('data-tab')}`);
      if (vistaObjetivo) vistaObjetivo.classList.remove('hidden');
    });
  });
}

function mostrarFinanzasYCompras(finanzas) {
  const totalesAcumulados = finanzas.totalesAcumulados || {};
  const listaDeCompras = finanzas.listaDeCompras || [];
  
  const podioRow = document.getElementById('podio-supermercados');
  const cuerpoTabla = document.getElementById('cuerpo-tabla-compras');

  if (!podioRow || !cuerpoTabla) return;
  podioRow.innerHTML = '';
  cuerpoTabla.innerHTML = '';

  const ordenados = Object.entries(totalesAcumulados).sort((a, b) => a[1] - b[1]);
  if (ordenados.length > 0) {
    const [superMasBarato] = ordenados[0];

    ordenados.forEach(([supermercado, total]) => {
      const esGanador = supermercado === superMasBarato;
      const cardHTML = `
        <div style="flex: 1; min-width: 200px; padding: 20px; border-radius: 12px; border: 2px solid ${esGanador ? '#2ecc71' : '#e2e8f0'}; background: ${esGanador ? '#f0fdf4' : '#ffffff'}; text-align: center;">
          ${esGanador ? '<span style="background:#2ecc71; color:white; font-size:0.75rem; padding:4px 8px; border-radius:12px; font-weight:bold;">🏆 RECOMENDADO</span>' : ''}
          <h4 style="margin:10px 0 5px; color:#1e293b;">${supermercado}</h4>
          <p style="font-size:1.6rem; font-weight:bold; color:${esGanador ? '#27ae60' : '#475569'};">$${total.toLocaleString('es-CL')}</p>
        </div>
      `;
      podioRow.insertAdjacentHTML('beforeend', cardHTML);
    });
  }

  if (listaDeCompras.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:#64748b;">¡Tienes todo en casa! No necesitas comprar nada esta semana. 🎉</td></tr>`;
  } else {
    listaDeCompras.forEach(item => {
      const precios = item.preciosPorCadena || {};
      const l = precios.Lider || 0;
      const j = precios.Jumbo || 0;
      const u = precios.Unimarc || 0;

      const filaHTML = `
        <tr>
          <td style="text-transform:capitalize; font-weight:600;">${item.ingrediente}</td>
          <td style="text-align:center; font-weight:bold; background:#f8fafc;">${item.cantidad}</td>
          <td style="text-align:right; color:#475569;">$${l.toLocaleString('es-CL')}</td>
          <td style="text-align:right; color:#475569;">$${j.toLocaleString('es-CL')}</td>
          <td style="text-align:right; color:#475569;">$${u.toLocaleString('es-CL')}</td>
        </tr>
      `;
      cuerpoTabla.insertAdjacentHTML('beforeend', filaHTML);
    });
  }
}