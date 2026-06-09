/* ==========================================================================
   1. CAPTURA DE ELEMENTOS (Sincronizados perfectamente con el nuevo HTML)
   ========================================================================== */
const formulario = document.getElementById('filter-form');
const contenedorRecetas = document.getElementById('recipes-container');
const cajaFinanzas = document.getElementById('finance-summary');
const txtGasto = document.getElementById('total-cost');
const txtAhorro = document.getElementById('total-savings');
const btnLimpiar = document.getElementById('btn-clear');
const mensajePlaceholder = document.getElementById('placeholder-message');
const txtConversionEdad = document.getElementById('age-conversion');
const inputEdad = document.getElementById('age');

// Evita capturar el .value antes de que cargue el DOM
const getFormatoAlimentacion = () => {
  const elemento = document.getElementById('format') || document.getElementById('formato') || document.getElementById('formatoAlimentacion');
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
    if (mesesRestantes > 0) {
      mensaje += ` y ${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'}`;
    } else {
      mensaje += ' exactos';
    }
    txtConversionEdad.textContent = mensaje;
  }
}

if (inputEdad && txtConversionEdad) {
  inputEdad.addEventListener('input', (e) => {
    calcularConversionEdad(parseInt(e.target.value));
  });
}

/* ==========================================================================
   1C. LÓGICA DE PERSISTENCIA (GUARDAR Y CARGAR LOCALSTORAGE)
   ========================================================================== */
function guardarDatosFormulario() {
  const inputE = document.getElementById('age');
  const selectS = document.getElementById('gender');
  const selectF = document.getElementById('format');
  const inputP = document.getElementById('weight');
  const inputT = document.getElementById('height');
  const inputB = document.getElementById('budget');

  if (!inputE || !selectS || !selectF) return;

  const datos = {
    edadMeses: inputE.value,
    sexoBiologico: selectS.value,
    formatoAlimentacion: selectF.value,
    pesoKg: inputP ? inputP.value : '',
    tallaCm: inputT ? inputT.value : '',
    presupuestoMaximoCLP: inputB ? inputB.value : ''
  };

  localStorage.setItem('nutribebe_datos', JSON.stringify(datos));
  console.log("Datos respaldados en localStorage 💾");
}

function cargarDatosDesdeStorage() {
  const datosGuardados = localStorage.getItem('nutribebe_datos');
  if (datosGuardados) {
    const datos = JSON.parse(datosGuardados);
    
    const inputE = document.getElementById('age');
    const selectS = document.getElementById('gender');
    const selectF = document.getElementById('format');
    const inputP = document.getElementById('weight');
    const inputT = document.getElementById('height');
    const inputB = document.getElementById('budget');

    if(inputE && datos.edadMeses) { inputE.value = datos.edadMeses; calcularConversionEdad(parseInt(datos.edadMeses)); }
    if(selectS && datos.sexoBiologico) selectS.value = datos.sexoBiologico;
    if(selectF && datos.formatoAlimentacion) selectF.value = datos.formatoAlimentacion;
    if(inputP && datos.pesoKg) inputP.value = datos.pesoKg;
    if(inputT && datos.tallaCm) inputT.value = datos.tallaCm;
    if(inputB && datos.presupuestoMaximoCLP) inputB.value = datos.presupuestoMaximoCLP;
    
    console.log("Datos recuperados del localStorage exitosamente. 🔄");
  }
}

/* ==========================================================================
   2. ESCUCHAR EL ENVÍO DEL FORMULARIO
   ========================================================================== */
if (formulario) {
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const edadMeses = parseInt(document.getElementById('age').value);
    const sexoBiologico = document.getElementById('gender').value;
    const pesoKg = parseFloat(document.getElementById('weight').value);
    const tallaCm = parseFloat(document.getElementById('height').value);
    const presupuestoMaximoCLP = parseInt(document.getElementById('budget').value);

    const checkboxes = document.querySelectorAll('input[name="allergens"]:checked');
    const alergias = Array.from(checkboxes).map(cb => cb.value);
    const mercaderiaEnCasa = Array.from(formulario.querySelectorAll('input[name="despensa"]:checked')).map(el => el.value);

    const datosBebe = {
      edadMeses,
      sexoBiologico,
      pesoKg,
      tallaCm,
      alergias,
      presupuestoMaximoCLP,
      formatoAlimentacion: getFormatoAlimentacion()
    };

    try {
      if (mensajePlaceholder) mensajePlaceholder.classList.add('hidden');
      if (cajaFinanzas) cajaFinanzas.classList.add('hidden');
      
      const contenedorModulo = document.getElementById('modulo-finanzas');
      if (contenedorModulo) contenedorModulo.style.display = 'none';

      contenedorRecetas.innerHTML = '<p class="placeholder-text">Calculando requerimientos calóricos y estructurando tu menú semanal... 🍳</p>';

      const respuesta = await fetch('https://menu-bebe-api.onrender.com/api/menu-personalizado', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...datosBebe,
          mercaderiaEnCasa
        })
      });

      const resultado = await respuesta.json();

      if (respuesta.ok) {
        guardarDatosFormulario(); 
        dibujarMenuEnPantalla(resultado); 
        
        // 🔥 CORREGIDO: Cambiado de 'data' a 'resultado' para leer el objeto financiero dinámico
        if (resultado.finanzasSupermercados) {
          mostrarFinanzasYCompras(resultado.finanzasSupermercados);
        }
      } else {
        contenedorRecetas.innerHTML = `<p class="placeholder-text" style="color: var(--color-precio);">Error: ${resultado.mensaje}</p>`;
      }

    } catch (error) {
      console.error("Error de conexión:", error); 
      contenedorRecetas.innerHTML = `
        <p class="placeholder-text" style="color: var(--color-precio); font-weight: bold;">
        ⚠️ No se pudo conectar con el servidor en la nube. <br>
        <span style="font-size: 0.85rem; font-weight: normal; color: var(--color-texto);">Revisa que tu servidor de Render esté encendido.</span>
        </p>`;
    }
  }); // <-- CORREGIDO: Cierre correcto del event listener del formulario
}

/* ==========================================================================
   3. FUNCIÓN PARA DIBUJAR EL CALENDARIO SEMANAL EN PESTAÑAS
   ========================================================================== */
function dibujarMenuEnPantalla(datos) {
  const contenedorTabs = document.getElementById('menu-tabs');
  contenedorRecetas.innerHTML = '';

  if (!datos.menuSemanal || Object.keys(datos.menuSemanal).length === 0) {
    if (mensajePlaceholder) {
      mensajePlaceholder.textContent = 'No se encontraron recetas suficientes para armar el calendario semanal. ¡Intenta ajustar los filtros!';
      mensajePlaceholder.classList.remove('hidden');
    }
    if (cajaFinanzas) cajaFinanzas.classList.add('hidden');
    if (contenedorTabs) contenedorTabs.classList.add('hidden');
    return;
  }

  if (contenedorTabs) contenedorTabs.classList.remove('hidden');
  if (cajaFinanzas) cajaFinanzas.classList.remove('hidden');

  const primerDia = Object.values(datos.menuSemanal)[0] || {};
  const advertencias = [];
  if (!primerDia.desayuno)     advertencias.push('desayunos');
  if (!primerDia.colacionTarde) advertencias.push('colaciones');
  if (!primerDia.postre)       advertencias.push('postres');
  if (advertencias.length > 0) {
    const avisoEl = document.createElement('p');
    avisoEl.style.cssText = 'font-size:0.82rem; color:var(--color-secundario); margin-bottom:10px; text-align:center;';
    avisoEl.textContent = `⚠️ Sin recetas en la BD para: ${advertencias.join(', ')}. Se muestra texto de respaldo.`;
    contenedorRecetas.appendChild(avisoEl);
  }

  if (datos.infoNutricionalBebe) {
    const infoNutri = datos.infoNutricionalBebe;
    const infoBox = document.createElement('div');
    infoBox.className = 'alert-box-container'; 
    infoBox.style.borderLeftColor = 'var(--color-primario)';
    infoBox.style.backgroundColor = 'var(--color-input-bg)';
    infoBox.style.marginBottom = '25px';
    
    infoBox.innerHTML = `
      <h3 style="color: var(--color-texto);">📊 Informe de Requerimientos Nutricionales</h3>
      <p style="margin-top: 5px; font-size: 0.95rem;">Según el peso, talla y edad ingresados, tu bebé se encuentra en estado de: <strong>${infoNutri.evaluacionBiometrica.estadoNutricional}</strong> (IMC: ${infoNutri.evaluacionBiometrica.imcCalculado}).</p>
      <ul style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; list-style: none; padding-left: 0;">
        <li>🔹 <strong>Meta de Energía:</strong> ${infoNutri.caloriasMeta} kcal/día</li>
        <li>🔹 <strong>Líquidos Recomendados:</strong> ${infoNutri.liquidosMeta} mL/día</li>
        <li>🥩 <strong>Proteínas:</strong> ${infoNutri.macrosMeta.proteinasGramos}g /día</li>
        <li>🥑 <strong>Grasas Buenas:</strong> ${infoNutri.macrosMeta.grasasGramos}g /día</li>
        <li>🌾 <strong>Carbohidratos:</strong> ${infoNutri.macrosMeta.carbohidratosGramos}g /día</li>
      </ul>
    `;
    contenedorRecetas.appendChild(infoBox);
  }

  const formatearCLP = (numero) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(numero);
  };
  if (txtGasto) txtGasto.innerHTML = formatearCLP(datos.gastoSemanalCalculado || 0);
  if (txtAhorro) txtAhorro.innerHTML = formatearCLP(datos.dineroAhorradoSemanal || 0);

  const categoriasTipos = ['principales', 'desayunos', 'colaciones', 'postres'];
  const subGrillas = {};

  categoriasTipos.forEach(cat => {
    const grid = document.createElement('div');
    grid.className = `recetas-grid tab-content-view ${cat === 'principales' ? '' : 'hidden'}`;
    grid.id = `grid-view-${cat}`;
    contenedorRecetas.appendChild(grid);
    subGrillas[cat] = grid;
  });

  const IMAGENES_POR_CATEGORIA = {
    principal:  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&h=220&q=80',
    desayuno:   'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&h=220&q=80',
    colacion:   'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=400&h=220&q=80',
    postre:     'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&h=220&q=80',
    default:    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&h=220&q=80'
  };
  const getImagen = (categoria) => IMAGENES_POR_CATEGORIA[categoria] || IMAGENES_POR_CATEGORIA.default;

  Object.keys(datos.menuSemanal).forEach(dia => {
    const menuDia = datos.menuSemanal[dia];

    // --- ALMUERZOS Y CENAS ---
    const tarjetaPrincipal = document.createElement('div');
    tarjetaPrincipal.className = 'receta-card tarjeta-receta';
    tarjetaPrincipal.innerHTML = `
      <div class="receta-image-container" style="height: 120px;">
        <div class="alerta-card-banner" style="background-color: var(--color-primario); opacity: 0.9;">🍳 ${dia.toUpperCase()}</div>
        <img src="${getImagen('principal')}" alt="${menuDia.almuerzo.nombre}" class="receta-img">
      </div>
      <div class="receta-body" style="padding: 15px;">
        <h3 style="color: var(--color-primario-hover); margin-bottom: 8px;">☀️ Almuerzo y 🌙 Cena</h3>
        <p style="font-weight: 600; font-size: 1.05rem; margin-bottom: 10px;">${menuDia.almuerzo.nombre}</p>
        <div style="font-size: 0.85rem; background: var(--color-input-bg); padding: 8px; border-radius: 6px;">
          <strong>Preparación:</strong> ${menuDia.almuerzo.pasos?.[0] || 'Cocinar adecuadamente según consistencia sugerida.'}
        </div>
      </div>`;
    subGrillas['principales'].appendChild(tarjetaPrincipal);

    // --- DESAYUNOS ---
    const tarjetaDesayuno = document.createElement('div');
    tarjetaDesayuno.className = 'receta-card tarjeta-receta';
    tarjetaDesayuno.innerHTML = `
      <div class="receta-image-container" style="height: 120px;">
        <div class="alerta-card-banner" style="background-color: #e67e22; opacity: 0.9;">🥞 ${dia.toUpperCase()}</div>
        <img src="${getImagen('desayuno')}" alt="Desayuno" class="receta-img">
      </div>
      <div class="receta-body" style="padding: 15px;">
        <h3 style="color: #e67e22; margin-bottom: 8px;">🌅 Desayuno Completo</h3>
        <p style="font-weight: 600; font-size: 1.05rem; margin-bottom: 10px;">${menuDia.desayuno ? menuDia.desayuno.nombre : 'Leche materna / Fórmula de inicio'}</p>
        <div style="font-size: 0.85rem; background: var(--color-input-bg); padding: 8px; border-radius: 6px;">
          <strong>Info:</strong> ${menuDia.desayuno ? (menuDia.desayuno.pasos?.[0] || 'Servir tibio a primera hora.') : 'Esencial para iniciar los requerimientos del día.'}
        </div>
      </div>`;
    subGrillas['desayunos'].appendChild(tarjetaDesayuno);

    // --- COLACIONES ---
    const tarjetaColacion = document.createElement('div');
    tarjetaColacion.className = 'receta-card tarjeta-receta';
    tarjetaColacion.innerHTML = `
      <div class="receta-image-container" style="height: 120px;">
        <div class="alerta-card-banner" style="background-color: #2ecc71; opacity: 0.9;">🍎 ${dia.toUpperCase()}</div>
        <img src="${getImagen('colacion')}" alt="Colación" class="receta-img">
      </div>
      <div class="receta-body" style="padding: 15px;">
        <h3 style="color: #2ecc71; margin-bottom: 8px;">⏱️ Colaciones del Día</h3>
        <p style="font-weight: 600; font-size: 1.05rem; margin-bottom: 10px;">${menuDia.colacionTarde ? menuDia.colacionTarde.nombre : 'Fruta picada de la estación'}</p>
        <div style="font-size: 0.85rem; background: var(--color-input-bg); padding: 8px; border-radius: 6px;">
          <strong>Sugerencia:</strong> Ofrecer hidratación complementaria junto a esta porción.
        </div>
      </div>`;
    subGrillas['colaciones'].appendChild(tarjetaColacion);

    // --- POSTRES ---
    const tarjetaPostre = document.createElement('div');
    tarjetaPostre.className = 'receta-card tarjeta-receta';
    tarjetaPostre.innerHTML = `
      <div class="receta-image-container" style="height: 120px;">
        <div class="alerta-card-banner" style="background-color: #9b59b6; opacity: 0.9;">🍓 ${dia.toUpperCase()}</div>
        <img src="${getImagen('postre')}" alt="Postre" class="receta-img">
      </div>
      <div class="receta-body" style="padding: 15px;">
        <h3 style="color: #9b59b6; margin-bottom: 8px;">🍧 Postre de Cierre</h3>
        <p style="font-weight: 600; font-size: 1.05rem; margin-bottom: 10px;">${menuDia.postre ? menuDia.postre.nombre : 'Compota de fruta natural (sin azúcar)'}</p>
        <div style="font-size: 0.85rem; background: var(--color-input-bg); padding: 8px; border-radius: 6px;">
          <strong>Tip:</strong> Evitar endulzantes y azúcares añadidos en preparaciones pediátricas.
        </div>
      </div>`;
    subGrillas['postres'].appendChild(tarjetaPostre);
  });

  const botonesTabs = document.querySelectorAll('.tab-btn');
  botonesTabs.forEach(boton => {
    boton.addEventListener('click', () => {
      botonesTabs.forEach(b => b.classList.remove('active'));
      boton.classList.add('active');

      const vistas = document.querySelectorAll('.tab-content-view');
      vistas.forEach(v => v.classList.add('hidden'));

      const pestañaObjetivo = boton.getAttribute('data-tab');
      const grillaActiva = document.getElementById(`grid-view-${pestañaObjetivo}`);
      if (grillaActiva) grillaActiva.classList.remove('hidden');
    });
  });
}

/* ==========================================================================
   4. LÓGICA DEL BOTÓN LIMPIAR FILTROS Y COMIENZO DE LA APP
   ========================================================================== */
if (btnLimpiar) {
  btnLimpiar.addEventListener('click', () => {
    formulario.reset();
    localStorage.removeItem('nutribebe_datos'); 
    contenedorRecetas.innerHTML = '';
    if (mensajePlaceholder) {
      mensajePlaceholder.textContent = 'Ingresa los datos de tu bebé para calcular un menú balanceado y económico.';
      mensajePlaceholder.classList.remove('hidden');
    }
    if (cajaFinanzas) cajaFinanzas.classList.add('hidden');
    
    const contenedorModulo = document.getElementById('modulo-finanzas');
    if (contenedorModulo) contenedorModulo.style.display = 'none';
  });
}

// Inicialización controlada y unificada de eventos al cargar la ventana
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosDesdeStorage();

  document.querySelectorAll('input, select').forEach(elemento => {
    elemento.addEventListener('change', guardarDatosFormulario);
  });
});

/* ==========================================================================
   5. RENDERIZADO DEL MÓDULO DE FINANZAS Y LISTA DE COMPRAS (OPTIMIZADO)
   ========================================================================== */
function mostrarFinanzasYCompras(finanzas) {
  // Evitamos la desestructuración estricta en caso de que cambie la firma del JSON
  const totalesAcumulados = finanzas.totalesAcumulados || {};
  const listaDeCompras = finanzas.listaDeCompras || [];
  
  const contenedorModulo = document.getElementById('modulo-finanzas');
  const podioRow = document.getElementById('podio-supermercados');
  const cuerpoTabla = document.getElementById('cuerpo-tabla-compras');

  // Si no existen los elementos en la maqueta actual del HTML, salimos limpiamente sin romper el script
  if (!contenedorModulo || !podioRow || !cuerpoTabla) {
    console.warn("Módulo de finanzas no encontrado en el DOM.");
    return;
  }

  // 1. Limpiar los nodos internos antes de inyectar los nuevos resultados
  podioRow.innerHTML = '';
  cuerpoTabla.innerHTML = '';

  // Validamos si el objeto de totales contiene datos válidos
  const keysTotales = Object.keys(totalesAcumulados);
  if (keysTotales.length > 0) {
    // Ordenamos de menor a mayor precio para posicionar al ganador
    const ordenados = Object.entries(totalesAcumulados).sort((a, b) => a[1] - b[1]);
    const [superMasBarato, precioMasBarato] = ordenados[0];

    ordenados.forEach(([supermercado, total]) => {
      const esGanador = supermercado === superMasBarato;
      const totalFormateado = typeof total === 'number' ? total.toLocaleString('es-CL') : '0';
      
      const cardHTML = `
        <div style="flex: 1; min-width: 200px; margin: 10px; padding: 15px; border-radius: 8px; border: 2px solid ${esGanador ? 'var(--color-primario)' : '#e2e8f0'}; background: ${esGanador ? 'var(--color-input-bg)' : '#ffffff'}; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          ${esGanador ? '<span style="background: var(--color-primario); color: white; font-size: 0.75rem; padding: 4px 8px; border-radius: 12px; font-weight: bold; display: inline-block; margin-bottom: 8px;">🏆 MÁS ECONÓMICO</span>' : ''}
          <h5 style="margin: 5px 0; font-size: 1.1rem; color: var(--color-texto); font-weight: bold;">${supermercado}</h5>
          <p style="font-size: 1.5rem; font-weight: bold; color: ${esGanador ? 'var(--color-primario-hover)' : 'var(--color-texto)'}; margin: 5px 0;">$${totalFormateado}</p>
        </div>
      `;
      podioRow.insertAdjacentHTML('beforeend', cardHTML);
    });
  }

  // 2. Renderizar las filas de la tabla sin duplicados de ingredientes
  if (listaDeCompras.length === 0) {
    cuerpoTabla.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">¡Tienes todo en casa! No necesitas comprar nada esta semana. 🎉</td></tr>`;
  } else {
    listaDeCompras.forEach(item => {
      // Acceso seguro: Intentamos leer preciosPorCadena o preciosPorChain, con fallback a 0 si no vienen datos
      const contenedorPrecios = item.preciosPorCadena || item.preciosPorChain || {};
      
      const pLider = contenedorPrecios.Lider || contenedorPrecios.lider || 0;
      const pJumbo = contenedorPrecios.Jumbo || contenedorPrecios.jumbo || 0;
      const pUnimarc = contenedorPrecios.Unimarc || contenedorPrecios.unimarc || 0;

      const filaHTML = `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; text-transform: capitalize; font-weight: bold; color: var(--color-texto);">${item.ingrediente || item.nombre || 'Ingrediente'}</td>
          <td style="padding: 10px; text-align: center; font-weight: bold; background: #f8fafc;">${item.cantidad || item.cantidadNecesaria || 1}</td>
          <td style="padding: 10px; text-align: right; color: #475569;">$${pLider.toLocaleString('es-CL')}</td>
          <td style="padding: 10px; text-align: right; color: #475569;">$${pJumbo.toLocaleString('es-CL')}</td>
          <td style="padding: 10px; text-align: right; color: #475569;">$${pUnimarc.toLocaleString('es-CL')}</td>
        </tr>
      `;
      cuerpoTabla.insertAdjacentHTML('beforeend', filaHTML);
    });
  }

  // 3. Forzar el despliegue del contenedor financiero de forma independiente
  contenedorModulo.style.setProperty('display', 'block', 'important');
}