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

// Modificado para evitar capturar el .value antes de que cargue el DOM
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
  // Captura flexible adaptada a múltiples variantes de IDs comunes
  const inputE = document.getElementById('age') || document.getElementById('edad') || document.getElementById('edadMeses');
  const selectS = document.getElementById('gender') || document.getElementById('sexo') || document.getElementById('sexoBiologico');
  const selectF = document.getElementById('format') || document.getElementById('formato') || document.getElementById('formatoAlimentacion');
  const inputP = document.getElementById('weight') || document.getElementById('peso') || document.getElementById('pesoKg');
  const inputT = document.getElementById('height') || document.getElementById('talla') || document.getElementById('tallaCm');
  const inputB = document.getElementById('budget') || document.getElementById('presupuesto') || document.getElementById('presupuestoMaximoCLP');

  if (!inputE || !selectS || !selectF) {
    console.warn("Advertencia: No se encontraron los campos principales del formulario para guardar.");
    return;
  }

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
    
    const inputE = document.getElementById('age') || document.getElementById('edad') || document.getElementById('edadMeses');
    const selectS = document.getElementById('gender') || document.getElementById('sexo') || document.getElementById('sexoBiologico');
    const selectF = document.getElementById('format') || document.getElementById('formato') || document.getElementById('formatoAlimentacion');
    const inputP = document.getElementById('weight') || document.getElementById('peso') || document.getElementById('pesoKg');
    const inputT = document.getElementById('height') || document.getElementById('talla') || document.getElementById('tallaCm');
    const inputB = document.getElementById('budget') || document.getElementById('presupuesto') || document.getElementById('presupuestoMaximoCLP');

    if(inputE && datos.edadMeses) { inputE.value = datos.edadMeses; calcularConversionEdad(parseInt(datos.edadMeses)); }
    if(selectS && datos.sexoBiologico) selectS.value = datos.sexoBiologico;
    if(selectF && datos.formatoAlimentacion) selectF.value = datos.formatoAlimentacion;
    if(inputP && datos.pesoKg) inputP.value = datos.pesoKg;
    if(inputT && datos.tallaCm) inputT.value = datos.tallaCm;
    if(inputB && datos.presupuestoMaximoCLP) inputB.value = datos.presupuestoMaximoCLP;
    
    console.log("Datos recuperados del localStorage exitosamente.");
  }
}

/* ==========================================================================
   2. ESCUCHAR EL ENVÍO DEL FORMULARIO
   ========================================================================== */
if (formulario) {
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    // Re-capturamos los IDs del bloque superior sincronizados
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
      presupuestoMaximoCLP
    };

    try {
      if (mensajePlaceholder) mensajePlaceholder.classList.add('hidden');
      if (cajaFinanzas) cajaFinanzas.classList.add('hidden');

      contenedorRecetas.innerHTML = '<p class="placeholder-text">Calculando requerimientos calóricos y estructurando tu menú semanal... 🍳</p>';

      const respuesta = await fetch('https://menu-bebe-api.onrender.com/api/menu-personalizado', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...datosBebe,
          formatoAlimentacion: getFormatoAlimentacion(), // Extraído dinámicamente mediante la función segura
          mercaderiaEnCasa
        })
      });

      const resultado = await respuesta.json();

      if (respuesta.ok) {
        guardarDatosFormulario(); // Corregido para usar el nombre de función unificado
        dibujarMenuEnPantalla(resultado); 
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
  });
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

  const rutaImagen = `https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&h=220&q=80`;

  Object.keys(datos.menuSemanal).forEach(dia => {
    const menuDia = datos.menuSemanal[dia];

    // --- ALMUERZOS Y CENAS ---
    const tarjetaPrincipal = document.createElement('div');
    tarjetaPrincipal.className = 'receta-card tarjeta-receta';
    tarjetaPrincipal.innerHTML = `
      <div class="receta-image-container" style="height: 120px;">
        <div class="alerta-card-banner" style="background-color: var(--color-primario); opacity: 0.9;">🍳 ${dia.toUpperCase()}</div>
        <img src="${rutaImagen}" alt="${menuDia.almuerzo.nombre}" class="receta-img">
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
        <img src="${rutaImagen}" alt="Desayuno" class="receta-img">
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
        <img src="${rutaImagen}" alt="Colación" class="receta-img">
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
        <img src="${rutaImagen}" alt="Postre" class="receta-img">
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
  });
}

// Inicialización controlada y unificada de eventos al cargar la ventana
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosDesdeStorage();

  // Registrar listeners dinámicos para los cambios en inputs
  document.querySelectorAll('input, select').forEach(elemento => {
    elemento.addEventListener('change', guardarDatosFormulario);
  });
});