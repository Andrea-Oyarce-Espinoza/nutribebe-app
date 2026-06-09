/* ==========================================================================
   1. CAPTURA DE ELEMENTOS GLOBALES
   ========================================================================== */
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
   2. CONTROL DE NAVEGACIÓN ENTRE VISTAS (PASO A PASO)
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
  document.getElementById('vista-paso1').classList.remove('hidden');
  document.getElementById('navegacion-resultados').classList.add('hidden');
  document.getElementById('vista-paso2').classList.add('hidden');
  document.getElementById('vista-paso3').classList.add('hidden');
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
      // Activamos Loader, ocultamos Formulario
      vistaForm.classList.add('hidden');
      loader.classList.remove('hidden');

      const respuesta = await fetch('https://menu-bebe-api.onrender.com/api/menu-personalizado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datosBebe, mercaderiaEnCasa })
      });

      const resultado = await respuesta.json();
      loader.classList.add('hidden');

      if (respuesta.ok) {
        // Guardamos en LocalStorage
        localStorage.setItem('nutribebe_datos', JSON.stringify(datosBebe));
        
        // Renderizamos componentes
        dibujarMenuEnPantalla(resultado);
        
        if (resultado.finanzasSupermercados) {
          mostrarFinanzasYCompras(resultado.finanzasSupermercados);
        }

        // Desplegamos barra de navegación y activamos el Paso 2 (Menú)
        document.getElementById('navegacion-resultados').classList.remove('hidden');
        cambiarPasoResultados('menu');
      } else {
        alert(`Error en el cálculo: ${resultado.mensaje}`);
        vistaForm.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      loader.classList.add('hidden');
      alert("⚠️ Error crítico de conexión con el backend en Render.");
      vistaForm.classList.remove('hidden');
    }
  });
}

/* ==========================================================================
   4. FUNCIÓN RENDERIZAR MENÚ RECOMENDADO
   ========================================================================== */
function dibujarMenuEnPantalla(datos) {
  contenedorRecetas.innerHTML = '';
  
  // Limpiar informes de requerimientos previos si existían
  const informeViejo = document.getElementById('informe-nutricional-dinamico');
  if (informeViejo) informeViejo.remove();

  if (!datos.menuSemanal || Object.keys(datos.menuSemanal).length === 0) return;

  // Inyectar Informe de requerimientos arriba de las pestañas en el Paso 2
  if (datos.infoNutricionalBebe) {
    const infoNutri = datos.infoNutricionalBebe;
    const infoBox = document.createElement('div');
    infoBox.id = 'informe-nutricional-dinamico';
    infoBox.className = 'alert-box-container';
    infoBox.style.marginBottom = '20px';
    infoBox.innerHTML = `
      <h3>📊 Informe de Requerimientos Nutricionales</h3>
      <p>Estado del bebé: <strong>${infoNutri.evaluacionBiometrica.estadoNutricional}</strong> (IMC: ${infoNutri.evaluacionBiometrica.imcCalculado})</p>
      <p style="margin-top:5px; font-size:0.9rem;">🎯 Meta: ${infoNutri.caloriasMeta} kcal/día | 💧 Líquidos: ${infoNutri.liquidosMeta} mL/día</p>
    `;
    document.getElementById('vista-paso2').prepend(infoBox);
  }

  // Actualizar indicadores numéricos simples
  if (txtGasto) txtGasto.textContent = `$${(datos.gastoSemanalCalculado || 0).toLocaleString('es-CL')}`;
  if (txtAhorro) txtAhorro.textContent = `$${(datos.dineroAhorradoSemanal || 0).toLocaleString('es-CL')}`;

  const categoriasTipos = ['principales', 'desayunos', 'colaciones', 'postres'];
  const subGrillas = {};

  categoriasTipos.forEach(cat => {
    const grid = document.createElement('div');
    grid.className = `recetas-grid tab-content-view ${cat === 'principales' ? '' : 'hidden'}`;
    grid.id = `grid-view-${cat}`;
    contenedorRecetas.appendChild(grid);
    subGrillas[cat] = grid;
  });

  Object.keys(datos.menuSemanal).forEach(dia => {
    const menuDia = datos.menuSemanal[dia];

    // Card de almuerzos y cenas
    const tarjeta = document.createElement('div');
    tarjeta.className = 'receta-card';
    tarjeta.innerHTML = `
      <div style="padding:15px; background: #f8fafc; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#1e293b;">📅 ${dia.toUpperCase()}</div>
      <div style="padding:15px;">
        <h4 style="color:#27ae60; margin-bottom:5px;">☀️ Almuerzo / Cena</h4>
        <p style="font-weight:600;">${menuDia.almuerzo.nombre}</p>
      </div>
    `;
    subGrillas['principales'].appendChild(tarjeta);
    
    // Mapeo básico para el resto de categorías (Desayuno, colaciones, postres)
    ['desayuno', 'colacionTarde', 'postre'].forEach(subCat => {
      const filaTab = document.createElement('div');
      filaTab.className = 'receta-card';
      const itemComida = menuDia[subCat];
      const destino = subCat === 'desayuno' ? 'desayunos' : subCat === 'colacionTarde' ? 'colaciones' : 'postres';
      
      filaTab.innerHTML = `
        <div style="padding:15px; background: #f8fafc; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#1e293b;">📅 ${dia.toUpperCase()}</div>
        <div style="padding:15px;">
          <p style="font-weight:600;">${itemComida ? itemComida.nombre : 'Sugerencia natural de la estación'}</p>
        </div>
      `;
      subGrillas[destino].appendChild(filaTab);
    });
  });

  // Switcher de pestañas internas
  const botonesTabs = document.querySelectorAll('.tab-btn');
  botonesTabs.forEach(boton => {
    boton.addEventListener('click', () => {
      botonesTabs.forEach(b => b.classList.remove('active'));
      boton.classList.add('active');
      document.querySelectorAll('.tab-content-view').forEach(v => v.classList.add('hidden'));
      document.getElementById(`grid-view-${boton.getAttribute('data-tab')}`).classList.remove('hidden');
    });
  });
}

/* ==========================================================================
   5. FUNCIÓN RENDERIZAR FINANZAS Y LISTA DE COMPRAS
   ========================================================================== */
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
      const precios = item.preciosPorCadena || item.preciosPorChain || {};
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

// Inicialización de persistencia al cargar la app
document.addEventListener('DOMContentLoaded', () => {
  const datosGuardados = localStorage.getItem('nutribebe_datos');
  if (datosGuardados) {
    const datos = JSON.parse(datosGuardados);
    if(document.getElementById('age') && datos.edadMeses) {
      document.getElementById('age').value = datos.edadMeses;
      calcularConversionEdad(parseInt(datos.edadMeses));
    }
    if(document.getElementById('gender') && datos.sexoBiologico) document.getElementById('gender').value = datos.sexoBiologico;
    if(document.getElementById('format') && datos.formatoAlimentacion) document.getElementById('format').value = datos.formatoAlimentacion;
    if(document.getElementById('weight') && datos.pesoKg) document.getElementById('weight').value = datos.pesoKg;
    if(document.getElementById('height') && datos.tallaCm) document.getElementById('height').value = datos.tallaCm;
    if(document.getElementById('budget') && datos.presupuestoMaximoCLP) document.getElementById('budget').value = datos.presupuestoMaximoCLP;
  }
});

if (btnLimpiar) {
  btnLimpiar.addEventListener('click', () => {
    formulario.reset();
    localStorage.removeItem('nutribebe_datos');
    volverAlFormulario();
  });
}