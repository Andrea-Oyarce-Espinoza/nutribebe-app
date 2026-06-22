/* ==========================================================================
   NutriBebé — app.js
   Flujo: Formulario → Modal Despensa → Loader → Resultados
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos del DOM ---
    const formulario        = document.getElementById('filter-form');
    const contenedorRecetas = document.getElementById('recipes-container');
    const txtGasto          = document.getElementById('total-cost');
    const txtAhorro         = document.getElementById('total-savings');
    const btnLimpiar        = document.getElementById('btn-clear');
    const txtConversionEdad = document.getElementById('age-conversion');
    const inputEdad         = document.getElementById('age');

    // ==========================================================================
    // 1. CONVERTIDOR DE EDAD EN TIEMPO REAL
    // ==========================================================================
    function calcularConversionEdad(meses) {
        if (isNaN(meses) || meses < 6) {
            if (txtConversionEdad) txtConversionEdad.textContent = '';
            return;
        }
        const anos = Math.floor(meses / 12);
        const mesesRestantes = meses % 12;
        if (meses < 12) {
            txtConversionEdad.textContent = `👶 Etapa de lactancia: ${meses} meses`;
        } else {
            let msg = `✨ Equivale a ${anos} ${anos === 1 ? 'año' : 'años'}`;
            if (mesesRestantes > 0) msg += ` y ${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'}`;
            txtConversionEdad.textContent = msg;
        }
    }

    if (inputEdad) {
        inputEdad.addEventListener('input', e => calcularConversionEdad(parseInt(e.target.value)));
    }

    // ==========================================================================
    // 2. RESTAURAR DATOS GUARDADOS
    // ==========================================================================
    const datosGuardados = localStorage.getItem('nutribebe_datos');
    if (datosGuardados) {
        try {
            const d = JSON.parse(datosGuardados);
            const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
            set('age',    d.edadMeses);
            set('gender', d.sexoBiologico);
            set('format', d.formatoAlimentacion);
            set('weight', d.pesoKg);
            set('height', d.tallaCm);
            set('budget', d.presupuestoMaximo);
            set('dias',   d.cantidadDias);
            if (d.edadMeses) calcularConversionEdad(parseInt(d.edadMeses));
        } catch (_) { localStorage.removeItem('nutribebe_datos'); }
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            formulario.reset();
            localStorage.removeItem('nutribebe_datos');
            if (txtConversionEdad) txtConversionEdad.textContent = '';
            volverAlFormulario();
        });
    }

    // ==========================================================================
    // 3. NAVEGACIÓN DE RESULTADOS
    // ==========================================================================
    const btnNavMenu    = document.getElementById('btn-nav-menu');
    const btnNavCompras = document.getElementById('btn-nav-compras');
    const btnNavVolver  = document.getElementById('btn-nav-volver');

    if (btnNavMenu)    btnNavMenu.addEventListener('click',    () => cambiarPasoResultados('menu'));
    if (btnNavCompras) btnNavCompras.addEventListener('click', () => cambiarPasoResultados('compras'));
    if (btnNavVolver)  btnNavVolver.addEventListener('click',  () => volverAlFormulario());

    // ==========================================================================
    // 4. ENVÍO DEL FORMULARIO → ABRE MODAL DE DESPENSA PRIMERO
    // ==========================================================================
    if (formulario) {
        formulario.addEventListener('submit', e => {
            e.preventDefault();

            // Recoger datos del formulario (sin despensa, eso va en el modal)
            const datosBebe = {
                edadMeses:           parseInt(document.getElementById('age').value),
                sexoBiologico:       document.getElementById('gender').value,
                pesoKg:              parseFloat(document.getElementById('weight').value),
                tallaCm:             parseFloat(document.getElementById('height').value),
                presupuestoMaximo:   parseInt(document.getElementById('budget').value) || 0,
                cantidadDias:        parseInt(document.getElementById('dias').value) || 7,
                alergias:            Array.from(document.querySelectorAll('input[name="allergens"]:checked')).map(cb => cb.value),
                formatoAlimentacion: document.getElementById('format').value || 'Mixto',
                mercaderiaEnCasa:    [] // se llena desde el modal
            };

            abrirModalDespensa(datosBebe);
        });
    }

    // ==========================================================================
    // 5. MODAL DE DESPENSA
    // ==========================================================================
    function abrirModalDespensa(datosBebe) {
        const modal = document.getElementById('modal-despensa');
        if (!modal) {
            // Si el modal no existe en el HTML, lanzar directo (fallback)
            enviarPeticion(datosBebe);
            return;
        }
        modal.style.display = 'flex';

        const btnConfirmar = document.getElementById('btn-confirmar-despensa');
        const btnSaltarDespensa = document.getElementById('btn-saltar-despensa');

        const confirmar = () => {
            datosBebe.mercaderiaEnCasa = Array.from(
                modal.querySelectorAll('input[name="despensa"]:checked')
            ).map(el => el.value);
            modal.style.display = 'none';
            enviarPeticion(datosBebe);
        };

        const saltar = () => {
            datosBebe.mercaderiaEnCasa = [];
            modal.style.display = 'none';
            enviarPeticion(datosBebe);
        };

        if (btnConfirmar) {
            // Remover listeners anteriores clonando el nodo
            const btnNuevo = btnConfirmar.cloneNode(true);
            btnConfirmar.parentNode.replaceChild(btnNuevo, btnConfirmar);
            btnNuevo.addEventListener('click', confirmar);
        }
        if (btnSaltarDespensa) {
            const btnNuevo2 = btnSaltarDespensa.cloneNode(true);
            btnSaltarDespensa.parentNode.replaceChild(btnNuevo2, btnSaltarDespensa);
            btnNuevo2.addEventListener('click', saltar);
        }

        // Cerrar con X
        const btnCerrarDespensa = document.getElementById('btn-cerrar-despensa');
        if (btnCerrarDespensa) btnCerrarDespensa.onclick = saltar;
    }

    // ==========================================================================
    // 6. PETICIÓN AL BACKEND
    // ==========================================================================
    async function enviarPeticion(datosBebe) {
        const loader    = document.getElementById('loader-pantalla');
        const vistaForm = document.getElementById('vista-paso1');

        try {
            vistaForm.classList.add('hidden');
            if (loader) loader.classList.remove('hidden');

            const respuesta = await fetch('https://menu-bebe-api.onrender.com/api/menu-personalizado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datosBebe })
            });

            const resultado = await respuesta.json();

            if (loader) loader.classList.add('hidden');

            // Alerta de presupuesto
            const warning = document.getElementById('budget-warning');
            if (warning) {
                if (resultado.excedePresupuesto) {
                    warning.classList.remove('hidden');
                    warning.classList.add('budget-alert');
                    warning.innerHTML = `⚠️ Este menú supera el presupuesto ingresado. Gasto estimado: <strong>$${(resultado.gastoSemanalCalculado || 0).toLocaleString('es-CL')}</strong> vs presupuesto de <strong>$${(resultado.presupuestoSemanal || 0).toLocaleString('es-CL')}</strong>.`;
                } else {
                    warning.classList.add('hidden');
                    warning.classList.remove('budget-alert');
                }
            }

            if (respuesta.ok) {
                localStorage.setItem('nutribebe_datos', JSON.stringify(datosBebe));
                dibujarMenuEnPantalla(resultado, contenedorRecetas, txtGasto, txtAhorro);

                if (resultado.finanzasSupermercados) {
                    mostrarFinanzasYCompras(resultado.finanzasSupermercados);
                }

                document.getElementById('navegacion-resultados').classList.remove('hidden');
                cambiarPasoResultados('menu');
            } else {
                alert(`Error: ${resultado.mensaje || 'Error desconocido del servidor.'}`);
                vistaForm.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Error de conexión:', err);
            if (loader) loader.classList.add('hidden');
            alert('⚠️ Error de conexión con el servidor. Verifica tu internet e intenta de nuevo.');
            vistaForm.classList.remove('hidden');
        }
    }

});

// ==========================================================================
// FUNCIONES GLOBALES DE NAVEGACIÓN
// ==========================================================================
function cambiarPasoResultados(objetivo) {
    const vistaMenu    = document.getElementById('vista-paso2');
    const vistaCompras = document.getElementById('vista-paso3');
    const btnMenu      = document.getElementById('btn-nav-menu');
    const btnCompras   = document.getElementById('btn-nav-compras');

    if (objetivo === 'menu') {
        vistaMenu?.classList.remove('hidden');
        vistaCompras?.classList.add('hidden');
        btnMenu?.classList.add('active');
        btnCompras?.classList.remove('active');
    } else {
        vistaMenu?.classList.add('hidden');
        vistaCompras?.classList.remove('hidden');
        btnMenu?.classList.remove('active');
        btnCompras?.classList.add('active');
    }
}

function volverAlFormulario() {
    document.getElementById('vista-paso1')?.classList.remove('hidden');
    document.getElementById('navegacion-resultados')?.classList.add('hidden');
    document.getElementById('vista-paso2')?.classList.add('hidden');
    document.getElementById('vista-paso3')?.classList.add('hidden');
}

// ==========================================================================
// MODAL DE DETALLE DE RECETA
// ==========================================================================
function abrirDetalleRecetaModal(receta, subCatTitulo) {
    const modal = document.getElementById('recipe-modal');
    const contenedorContenido = document.getElementById('modal-body-content');
    if (!modal || !contenedorContenido) return;

    if (!receta) {
        contenedorContenido.innerHTML = `<p style="color:#64748b;text-align:center;">Sin detalles disponibles.</p>`;
        modal.style.display = 'flex';
        return;
    }

    const colorBadge = subCatTitulo.includes('Almuerzo')
        ? 'background:#e8f8f0;color:#27ae60;'
        : 'background:#fff3cd;color:#856404;';

    const listaIng = receta.ingredientes?.length > 0
        ? receta.ingredientes.map(i =>
            `<li style="padding:7px 0;border-bottom:1px dashed #f1f5f9;font-size:.95rem;color:#334155;">• <strong>${i.cantidad || ''}</strong>${i.cantidad ? ' de ' : ''}${i.nombre}</li>`
          ).join('')
        : '<li style="color:#94a3b8;font-style:italic;">Sin ingredientes especificados.</li>';

    const preparacionHTML = receta.pasos?.length > 0
        ? receta.pasos.map((paso, i) =>
            `<p style="margin:6px 0;font-size:.95rem;line-height:1.5;color:#475569;"><strong>${i + 1}.</strong> ${paso}</p>`
          ).join('')
        : `<p style="color:#94a3b8;font-style:italic;font-size:.95rem;">🥣 Preparación hogareña estándar. Respetar consistencia para formato ${receta.formato || 'indicado'}.</p>`;

    contenedorContenido.innerHTML = `
        <div style="text-align:center;margin-bottom:15px;">
            <span style="font-size:.8rem;font-weight:bold;letter-spacing:.5px;text-transform:uppercase;color:#94a3b8;">${subCatTitulo}</span>
            <h2 style="color:#1e293b;margin:5px 0 10px;font-size:1.4rem;font-weight:700;">${receta.nombre}</h2>
            <span style="display:inline-block;${colorBadge}padding:4px 12px;border-radius:20px;font-size:.8rem;font-weight:bold;">Formato: ${receta.formato || 'N/E'}</span>
        </div>
        <div style="background:#f8fafc;border-left:4px solid #cbd5e1;padding:10px 15px;margin-bottom:20px;border-radius:0 8px 8px 0;">
            <p style="margin:0;font-size:.9rem;color:#64748b;font-style:italic;line-height:1.4;text-align:justify;">"${receta.descripcion || ''}"</p>
        </div>
        <div style="margin-bottom:20px;">
            <h4 style="color:#1e293b;margin:0 0 8px;font-size:1rem;border-bottom:2px solid #f1f5f9;padding-bottom:4px;">📋 Ingredientes</h4>
            <ul style="list-style:none;padding:0;margin:0;">${listaIng}</ul>
        </div>
        <div>
            <h4 style="color:#1e293b;margin:0 0 8px;font-size:1rem;border-bottom:2px solid #f1f5f9;padding-bottom:4px;">🍳 Preparación</h4>
            <div style="margin-top:8px;">${preparacionHTML}</div>
        </div>
    `;

    modal.style.display = 'flex';
    document.getElementById('close-modal').onclick = () => { modal.style.display = 'none'; };
}

// ==========================================================================
// RENDERIZADO DEL MENÚ SEMANAL
// ==========================================================================
function dibujarMenuEnPantalla(datos, contenedorRecetas, txtGasto, txtAhorro) {
    if (!contenedorRecetas) return;
    contenedorRecetas.innerHTML = '';

    // Limpiar informe anterior
    document.getElementById('informe-nutricional-dinamico')?.remove();
    document.querySelectorAll('.alert-box-container').forEach(el => el.remove());

    if (datos.infoNutricionalBebe) {
        const info = datos.infoNutricionalBebe;
        const box = document.createElement('div');
        box.id = 'informe-nutricional-dinamico';
        box.className = 'alert-box-container';
        box.innerHTML = `
            <h3>📊 Informe de Requerimientos Nutricionales</h3>
            <p>Estado: <strong>${info.evaluacionBiometrica.estadoNutricional}</strong></p>
            <p style="margin-top:5px;font-size:.9rem;">🎯 Meta: ${info.caloriasMeta} kcal/día | 💧 Líquidos: ${info.liquidosMeta} mL/día</p>
        `;
        document.getElementById('vista-paso2')?.prepend(box);
    }

    if (txtGasto) txtGasto.textContent = `$${(datos.gastoSemanalCalculado || 0).toLocaleString('es-CL')}`;
    if (txtAhorro) txtAhorro.textContent = `$${(datos.dineroAhorradoSemanal || 0).toLocaleString('es-CL')}`;

    if (!datos.menuSemanal || Object.keys(datos.menuSemanal).length === 0) return;

    const cats = ['principales', 'desayunos', 'colaciones', 'postres'];
    const subGrillas = {};

    cats.forEach(cat => {
        const grid = document.createElement('div');
        grid.className = `tab-content-view ${cat === 'principales' ? '' : 'hidden'}`;
        grid.id = `grid-view-${cat}`;
        contenedorRecetas.appendChild(grid);
        subGrillas[cat] = grid;
    });

    Object.keys(datos.menuSemanal).forEach(dia => {
        const menuDia = datos.menuSemanal[dia];

        // Tarjeta Almuerzo/Cena
        const tarjeta = document.createElement('div');
        tarjeta.className = 'receta-card';
        const almuerzo = menuDia.almuerzo;
        const ingAlmuerzoHTML = almuerzo?.ingredientes?.length > 0
            ? almuerzo.ingredientes.map(i => `<li style="font-size:.85rem;color:#475569;margin-bottom:2px;">• <strong>${i.cantidad || ''}</strong>${i.cantidad ? ' ' : ''}${i.nombre}</li>`).join('')
            : '<li style="font-size:.85rem;color:#94a3b8;">Fruta o acompañamiento simple</li>';

        tarjeta.innerHTML = `
            <div style="padding:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#1e293b;text-align:center;">📅 ${dia.toUpperCase()}</div>
            <div style="padding:15px;display:flex;flex-direction:column;gap:6px;">
                <h4 style="color:#27ae60;margin:0;font-size:.8rem;text-transform:uppercase;text-align:center;">☀️ Almuerzo / Cena</h4>
                <p style="font-weight:600;color:#334155;font-size:1rem;text-align:center;margin:0;">${almuerzo ? almuerzo.nombre : 'Plato Principal'}</p>
                <div style="margin-top:5px;border-top:1px dashed #cbd5e1;padding-top:6px;">
                    <ul style="list-style:none;padding:0;margin:0;">${ingAlmuerzoHTML}</ul>
                </div>
                <span style="font-size:.7rem;color:#94a3b8;text-align:center;margin-top:5px;display:block;">🔍 Haz clic para ver preparación</span>
            </div>
        `;
        if (almuerzo) tarjeta.addEventListener('click', () => abrirDetalleRecetaModal(almuerzo, '☀️ Almuerzo / Cena'));
        subGrillas['principales']?.appendChild(tarjeta);

        // Sub-categorías
        [
            { key: 'desayuno',      destino: 'desayunos',  titulo: '🥞 Desayuno' },
            { key: 'colacionTarde', destino: 'colaciones', titulo: '🍎 Colación' },
            { key: 'postre',        destino: 'postres',    titulo: '🍓 Postre'   }
        ].forEach(({ key, destino, titulo }) => {
            const item = menuDia[key];
            const card = document.createElement('div');
            card.className = 'receta-card';
            const ingHTML = item?.ingredientes?.length > 0
                ? item.ingredientes.map(i => `<li style="font-size:.85rem;color:#475569;margin-bottom:2px;">• <strong>${i.cantidad || ''}</strong>${i.cantidad ? ' ' : ''}${i.nombre}</li>`).join('')
                : '<li style="font-size:.85rem;color:#94a3b8;">Porción natural recomendada</li>';

            card.innerHTML = `
                <div style="padding:12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#1e293b;text-align:center;">📅 ${dia.toUpperCase()}</div>
                <div style="padding:15px;display:flex;flex-direction:column;gap:6px;">
                    <h4 style="color:var(--color-secundario);margin:0;font-size:.8rem;text-transform:uppercase;text-align:center;">${titulo}</h4>
                    <p style="font-weight:600;color:#334155;font-size:1rem;text-align:center;margin:0;">${item ? item.nombre : 'Sugerencia de la estación'}</p>
                    <div style="margin-top:5px;border-top:1px dashed #cbd5e1;padding-top:6px;">
                        <ul style="list-style:none;padding:0;margin:0;">${ingHTML}</ul>
                    </div>
                    ${item ? '<span style="font-size:.7rem;color:#94a3b8;text-align:center;margin-top:5px;display:block;">🔍 Haz clic para ver preparación</span>' : ''}
                </div>
            `;
            if (item) card.addEventListener('click', () => abrirDetalleRecetaModal(item, titulo));
            subGrillas[destino]?.appendChild(card);
        });
    });

    // Pestañas
    document.querySelectorAll('.tab-btn').forEach(boton => {
        boton.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            boton.classList.add('active');
            document.querySelectorAll('.tab-content-view').forEach(v => v.classList.add('hidden'));
            document.getElementById(`grid-view-${boton.getAttribute('data-tab')}`)?.classList.remove('hidden');
        });
    });
}

// ==========================================================================
// RENDERIZADO DE FINANZAS Y COMPRAS
// Precio null = No disponible en esa cadena
// ==========================================================================
function mostrarFinanzasYCompras(finanzas) {
    const totalesAcumulados = finanzas.totalesAcumulados || {};
    const listaDeCompras    = finanzas.listaDeCompras || [];

    const podioRow    = document.getElementById('podio-supermercados');
    const cuerpoTabla = document.getElementById('cuerpo-tabla-compras');
    if (!podioRow || !cuerpoTabla) return;

    podioRow.innerHTML    = '';
    cuerpoTabla.innerHTML = '';

    // Filtrar cadenas que tienen al menos algún producto disponible (total > 0)
    const ordenados = Object.entries(totalesAcumulados)
        .filter(([, total]) => total > 0)
        .sort(([, a], [, b]) => a - b);

    if (ordenados.length > 0) {
        const superMasBarato = ordenados[0][0];
        ordenados.forEach(([supermercado, total]) => {
            const esGanador = supermercado === superMasBarato;
            podioRow.insertAdjacentHTML('beforeend', `
                <div style="flex:1;min-width:180px;padding:20px;border-radius:12px;border:2px solid ${esGanador ? '#2ecc71' : '#e2e8f0'};background:${esGanador ? '#f0fdf4' : '#ffffff'};text-align:center;">
                    ${esGanador ? '<span style="background:#2ecc71;color:white;font-size:.75rem;padding:4px 8px;border-radius:12px;font-weight:bold;">🏆 RECOMENDADO</span>' : ''}
                    <h4 style="margin:10px 0 5px;color:#1e293b;">${supermercado}</h4>
                    <p style="font-size:1.6rem;font-weight:bold;color:${esGanador ? '#27ae60' : '#475569'};">$${total.toLocaleString('es-CL')}</p>
                </div>
            `);
        });
    }

    // Tabla de compras — mostrar las 3 principales cadenas más baratas
    const cadenasOrdenadas = ordenados.map(([c]) => c);
    const cadenasMostrar = cadenasOrdenadas.slice(0, 3);

    // Actualizar encabezados de la tabla dinámicamente
    const thead = document.querySelector('.tabla-moderna thead tr');
    if (thead && cadenasMostrar.length > 0) {
        thead.innerHTML = `
            <th>Ingredientes</th>
            <th style="text-align:center;">Cantidad</th>
            ${cadenasMostrar.map(c => `<th style="text-align:right;">${c}</th>`).join('')}
        `;
    }

    if (listaDeCompras.length === 0) {
        cuerpoTabla.innerHTML = `<tr><td colspan="${2 + cadenasMostrar.length}" style="text-align:center;padding:30px;color:#64748b;">¡Tienes todo en casa! No necesitas comprar nada esta semana. 🎉</td></tr>`;
        return;
    }

    listaDeCompras.forEach(item => {
        const precios = item.preciosPorCadena || {};
        const celdas = cadenasMostrar.map(cadena => {
            const precio = precios[cadena];
            if (precio === null || precio === undefined) {
                return `<td style="text-align:right;color:#94a3b8;font-style:italic;">No disponible</td>`;
            }
            return `<td style="text-align:right;color:#475569;">$${Math.round(precio).toLocaleString('es-CL')}</td>`;
        }).join('');

        cuerpoTabla.insertAdjacentHTML('beforeend', `
            <tr>
                <td style="text-transform:capitalize;font-weight:600;">${item.ingrediente}</td>
                <td style="text-align:center;font-weight:bold;background:#f8fafc;">${item.cantidad}</td>
                ${celdas}
            </tr>
        `);
    });
}