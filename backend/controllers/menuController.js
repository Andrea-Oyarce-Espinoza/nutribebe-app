const Receta = require('../models/Receta');
const IngredientPrice = require('../models/IngredientPrice');

// ==========================================================================
// FUNCIONES AUXILIARES PRIVADAS
// ==========================================================================

function obtenerTodosLosIngredientes(receta) {
    const lista = [];
    if (receta && receta.componentesNutricionales) {
        ['carbohidratos', 'vegetales', 'proteinas', 'acidosGrasos'].forEach(grupo => {
            const g = receta.componentesNutricionales[grupo];
            if (Array.isArray(g)) lista.push(...g);
        });
    }
    return lista;
}

function calcularRequerimientosNutricionales(edadMeses, pesoKg, sexoBiologico, tallaCm) {
    let factorCalorias = 82;
    let factorLiquidos = 140;

    if (edadMeses > 12 && edadMeses <= 36) {
        factorCalorias = 80;
        factorLiquidos = 115;
    } else if (edadMeses > 36) {
        factorCalorias = 75;
        factorLiquidos = 100;
    }

    const caloriasTotalesMeta = Math.round(pesoKg * factorCalorias);
    const liquidosTotalesMeta = Math.round(pesoKg * factorLiquidos);
    const tallaMetros = tallaCm / 100;
    const imc = (pesoKg / (tallaMetros * tallaMetros)).toFixed(1);

    return {
        caloriasMeta: caloriasTotalesMeta,
        liquidosMeta: liquidosTotalesMeta,
        evaluacionBiometrica: {
            imcCalculado: parseFloat(imc),
            estadoNutricional: "Evaluación referencial. Se recomienda control pediátrico."
        }
    };
}

/**
 * Parsea un texto de cantidad como "100g", "0.5 kg", "1 atado", "2 un"
 * RETORNA: { valor: Number, unidad: String } o null si no se puede parsear.
 *
 * NOTA IMPORTANTE SOBRE EL CAMPO "cantidad" EN LA BASE DE DATOS:
 * El campo cantidad en componentesNutricionales DEBE incluir la unidad junto al número.
 * Ejemplos válidos: "100g", "150 g", "0.5kg", "1 atado", "2 un", "200ml"
 * Ejemplos INVÁLIDOS: "1" (sin unidad), "al gusto" (texto libre sin número)
 * Para ingredientes por unidad (ej: huevo), usar: "1 un" o "2 un"
 * Para atados (ej: espinaca): "1 atado"
 */
function parsearCantidad(textoCantidad) {
    if (!textoCantidad) return null;

    const texto = textoCantidad.toLowerCase().trim();
    const match = texto.match(/^([\d.,]+)\s*(g|gr|kg|ml|l|un|unidad(?:es)?|atado(?:s)?)$/);

    if (!match) return null;

    let unidad = match[2];
    // Normalizar variantes
    if (unidad === 'gr') unidad = 'g';
    if (unidad === 'unidad' || unidad === 'unidades') unidad = 'un';
    if (unidad === 'atados') unidad = 'atado';

    return {
        valor: parseFloat(match[1].replace(',', '.')),
        unidad
    };
}

/**
 * Calcula el costo proporcional de un ingrediente según la cantidad pedida en la receta.
 * Por defecto retorna el precio promedio completo si no puede calcular proporción.
 *
 * Ejemplo: zapallo 1kg = $1500, receta pide "100g" → retorna $150
 */
function calcularCostoIngrediente(ingredienteDB, cantidadReceta) {
    const receta = parsearCantidad(cantidadReceta);
    const precioBase = ingredienteDB.precioPromedio || 0;

    if (!receta || !precioBase) return precioBase;

    const contenidoBase = ingredienteDB.contenidoUnidad || 1;
    const unidadBase = ingredienteDB.unidadContenido;
    let factor = 1;

    // Conversiones cruzadas de unidades
    if (unidadBase === 'kg' && receta.unidad === 'g')       factor = receta.valor / 1000;
    else if (unidadBase === 'kg' && receta.unidad === 'kg') factor = receta.valor / contenidoBase;
    else if (unidadBase === 'g' && receta.unidad === 'g')   factor = receta.valor / contenidoBase;
    else if (unidadBase === 'l' && receta.unidad === 'ml')  factor = receta.valor / 1000;
    else if (unidadBase === 'l' && receta.unidad === 'l')   factor = receta.valor / contenidoBase;
    else if (unidadBase === 'ml' && receta.unidad === 'ml') factor = receta.valor / contenidoBase;
    else if (unidadBase === 'un' && receta.unidad === 'un') factor = receta.valor / contenidoBase;
    else if (unidadBase === 'atado' && receta.unidad === 'atado') factor = receta.valor / contenidoBase;
    // Si las unidades son incompatibles, se usa el precio completo como fallback
    else factor = 1;

    return precioBase * factor;
}

/**
 * Calcula el costo por cadena según cantidad de receta.
 * Cuando el precio en una cadena es 0, significa que NO ESTÁ DISPONIBLE en ese local.
 * En ese caso retorna null (no disponible), no un precio estimado.
 */
function calcularCostoPorCadena(precioData, cantidadReceta, supermercado) {
    if (!precioData || !precioData.preciosPorCadena) return null;

    const entrada = precioData.preciosPorCadena.find(p => p.supermercado === supermercado);
    if (!entrada) return null;

    // Precio 0 = no disponible en este local
    if (entrada.precio === 0) return null;

    const receta = parsearCantidad(cantidadReceta);
    if (!receta) return entrada.precio; // Precio por unidad/empaque completo

    const contenidoBase = precioData.contenidoUnidad || 1;
    const unidadBase = precioData.unidadContenido;
    let factor = 1;

    if (unidadBase === 'kg' && receta.unidad === 'g')       factor = receta.valor / 1000;
    else if (unidadBase === 'kg' && receta.unidad === 'kg') factor = receta.valor / contenidoBase;
    else if (unidadBase === 'g' && receta.unidad === 'g')   factor = receta.valor / contenidoBase;
    else if (unidadBase === 'l' && receta.unidad === 'ml')  factor = receta.valor / 1000;
    else if (unidadBase === 'l' && receta.unidad === 'l')   factor = receta.valor / contenidoBase;
    else if (unidadBase === 'ml' && receta.unidad === 'ml') factor = receta.valor / contenidoBase;
    else if (unidadBase === 'un' && receta.unidad === 'un') factor = receta.valor / contenidoBase;
    else if (unidadBase === 'atado' && receta.unidad === 'atado') factor = receta.valor / contenidoBase;
    else factor = 1;

    return entrada.precio * factor;
}

// ==========================================================================
// CONTROLADORES EXPORTADOS
// ==========================================================================

exports.obtenerRecetas = async (req, res) => {
    try {
        const recetas = await Receta.find();
        res.status(200).json(recetas);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener recetas." });
    }
};

exports.crearReceta = async (req, res) => {
    try {
        const nuevaReceta = new Receta(req.body);
        await nuevaReceta.save();
        res.status(201).json({ mensaje: "Receta creada con éxito.", data: nuevaReceta });
    } catch (error) {
        res.status(400).json({ error: "Error al crear la receta.", detalle: error.message });
    }
};

exports.generarMenuPersonalizado = async (req, res) => {
    try {
        // BUG FIX: El body viene envuelto en { datosBebe: {...} } desde el frontend
        const datos = req.body.datosBebe || req.body;
        const { edadMeses, pesoKg, sexoBiologico, tallaCm, alergias, formatoAlimentacion, mercaderiaEnCasa, cantidadDias, presupuestoMaximo } = datos;

        if (!edadMeses || !pesoKg || !sexoBiologico || !tallaCm) {
            return res.status(400).json({ mensaje: "Faltan datos biométricos obligatorios." });
        }

        const infoNutricionalBebe = calcularRequerimientosNutricionales(
            Number(edadMeses), Number(pesoKg), sexoBiologico, Number(tallaCm)
        );

        // Filtros dinámicos
        const queryFiltros = { edadMinimaMeses: { $lte: Number(edadMeses) } };
        if (formatoAlimentacion && formatoAlimentacion !== 'Mixto') {
            queryFiltros.formato = formatoAlimentacion;
        }
        if (Array.isArray(alergias) && alergias.length > 0) {
            queryFiltros.alergenos = { $nin: alergias };
        }

        const recetasDisponibles = await Receta.find(queryFiltros);

        if (recetasDisponibles.length === 0) {
            return res.status(404).json({ mensaje: "No se encontraron recetas que coincidan con los filtros." });
        }

        // Separar por categoría
        const principales   = recetasDisponibles.filter(r => r.categoria === 'principal');
        const desayunos     = recetasDisponibles.filter(r => r.categoria === 'desayuno');
        const colaciones    = recetasDisponibles.filter(r => r.categoria === 'colacion');
        const postres       = recetasDisponibles.filter(r => r.categoria === 'postre');

        const todosDias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const numDias = (cantidadDias && cantidadDias >= 1 && cantidadDias <= 7) ? parseInt(cantidadDias) : 7;
        const dias = todosDias.slice(0, numDias);

        // Barajar para variedad
        const mezclar = (arr) => [...arr].sort(() => Math.random() - 0.5);
        const principalesBarajados  = mezclar(principales);
        const desayunosBarajados    = mezclar(desayunos);
        const colacionesBarajados   = mezclar(colaciones);
        const postresBarajados      = mezclar(postres);

        const obtenerRotativo = (arr, idx) => arr.length > 0 ? arr[idx % arr.length] : null;

        // Construir menú con rotación para evitar repeticiones el mismo día
        const menuSemanalRaw = {};
        dias.forEach((dia, idx) => {
            menuSemanalRaw[dia] = {
                almuerzo:      obtenerRotativo(principalesBarajados, idx),
                desayuno:      obtenerRotativo(desayunosBarajados, idx),
                colacionTarde: obtenerRotativo(colacionesBarajados, idx),
                postre:        obtenerRotativo(postresBarajados, idx)
            };
        });

        // Formatear menú y recolectar ingredientes
        const menuSemanalFormateado = {};
        const todosLosIngredientesDelMenu = [];

        for (const dia of dias) {
            menuSemanalFormateado[dia] = {};
            for (const subCat of ['almuerzo', 'desayuno', 'colacionTarde', 'postre']) {
                const recetaOriginal = menuSemanalRaw[dia][subCat];
                if (recetaOriginal) {
                    const listaIng = obtenerTodosLosIngredientes(recetaOriginal);
                    todosLosIngredientesDelMenu.push(...listaIng);
                    menuSemanalFormateado[dia][subCat] = {
                        _id: recetaOriginal._id,
                        nombre: recetaOriginal.nombre,
                        categoria: recetaOriginal.categoria,
                        formato: recetaOriginal.formato,
                        descripcion: recetaOriginal.descripcion || "Receta nutritiva recomendada para su desarrollo integral.",
                        pasos: recetaOriginal.pasos || [],
                        ingredientes: listaIng.map(i => ({ nombre: i.nombre, cantidad: i.cantidad || '' }))
                    };
                } else {
                    menuSemanalFormateado[dia][subCat] = null;
                }
            }
        }

        // --- MÓDULO DE FINANZAS ---
        const despensaSet = new Set((mercaderiaEnCasa || []).map(i => i.trim().toLowerCase()));

        // Ingredientes que hay que comprar (no están en la despensa)
        const ingredientesAComprar = todosLosIngredientesDelMenu.filter(
            ing => !despensaSet.has(ing.nombre.trim().toLowerCase())
        );

        const nombresUnicosAComprar = [...new Set(ingredientesAComprar.map(i => i.nombre.trim().toLowerCase()))];
        const infoPreciosIngredientes = await IngredientPrice.find({ nombre: { $in: nombresUnicosAComprar } });

        const mapaPrecios = {};
        infoPreciosIngredientes.forEach(ing => { mapaPrecios[ing.nombre.toLowerCase()] = ing; });

        let gastoSemanalCalculado = 0;
        let dineroAhorradoSemanal = 0;
        const listaDeComprasDetallada = [];

        const CADENAS = ['Lider', 'Jumbo', 'Unimarc', 'Santa Isabel', 'Tottus', 'Mayorista', 'Feria Libre'];
        const totalesAcumulados = {};
        CADENAS.forEach(c => { totalesAcumulados[c] = 0; });

        nombresUnicosAComprar.forEach(nombreIng => {
            const coincidencias = ingredientesAComprar.filter(
                i => i.nombre.trim().toLowerCase() === nombreIng
            );

            // Texto consolidado de cantidades para mostrar en tabla
            const cantidadesValidas = coincidencias.map(c => c.cantidad).filter(c => c && c.trim() !== '');
            const cantidadesUnicas = [...new Set(cantidadesValidas)];
            const cantidadTotalTexto = cantidadesUnicas.length > 0 ? cantidadesUnicas.join(' + ') : 'Al gusto';

            const precioData = mapaPrecios[nombreIng];

            // Costo real usando la cantidad proporcional de la receta
            let costoReal = 0;
            if (precioData && coincidencias.length > 0) {
                costoReal = coincidencias.reduce((total, ing) => {
                    return total + calcularCostoIngrediente(precioData, ing.cantidad);
                }, 0);
            } else if (precioData) {
                costoReal = precioData.precioPromedio || 0;
            }
            gastoSemanalCalculado += costoReal;

            // Precios por cadena con cálculo proporcional
            // null = no disponible, número = precio calculado por cantidad
            const cantidadRef = cantidadesValidas[0] || null;
            const preciosPorCadena = {};
            CADENAS.forEach(cadena => {
                const precio = calcularCostoPorCadena(precioData, cantidadRef, cadena);
                preciosPorCadena[cadena] = precio; // null si no disponible
                if (precio !== null) totalesAcumulados[cadena] += precio;
            });

            listaDeComprasDetallada.push({
                ingrediente: nombreIng,
                cantidad: cantidadTotalTexto,
                preciosPorCadena
            });
        });

        // Ahorro por despensa: valor de los ingredientes que ya tiene en casa
        const ingredientesEnDespensa = todosLosIngredientesDelMenu.filter(
            ing => despensaSet.has(ing.nombre.trim().toLowerCase())
        );
        const nombresUnicosDespensa = [...new Set(ingredientesEnDespensa.map(i => i.nombre.trim().toLowerCase()))];
        const infoPreciosDespensa = await IngredientPrice.find({ nombre: { $in: nombresUnicosDespensa } });

        infoPreciosDespensa.forEach(data => {
            // Buscar el ingrediente en la lista para usar su cantidad real
            const ingConCantidad = ingredientesEnDespensa.find(
                i => i.nombre.trim().toLowerCase() === data.nombre.toLowerCase()
            );
            const cantidad = ingConCantidad ? ingConCantidad.cantidad : null;
            dineroAhorradoSemanal += calcularCostoIngrediente(data, cantidad);
        });

        const presupuestoSemanal = (Number(presupuestoMaximo) || 0) * numDias;
        const excedePresupuesto = presupuestoSemanal > 0 && gastoSemanalCalculado > presupuestoSemanal;

        res.status(200).json({
            infoNutricionalBebe,
            menuSemanal: menuSemanalFormateado,
            gastoSemanalCalculado: Math.round(gastoSemanalCalculado),
            presupuestoSemanal,
            excedePresupuesto,
            dineroAhorradoSemanal: Math.round(dineroAhorradoSemanal),
            finanzasSupermercados: {
                totalesAcumulados: Object.fromEntries(
                    Object.entries(totalesAcumulados).map(([k, v]) => [k, Math.round(v)])
                ),
                listaDeCompras: listaDeComprasDetallada
            }
        });

    } catch (error) {
        console.error("Error grave en generarMenuPersonalizado:", error);
        res.status(500).json({ error: "Error en el servidor al procesar el menú.", detalle: error.message });
    }
};

exports.crearIngrediente = async (req, res) => {
    try {
        const datos = req.body;
        const lista = Array.isArray(datos) ? datos : [datos];

        const operaciones = lista.map(ingrediente => {
            return IngredientPrice.findOneAndUpdate(
                { nombre: ingrediente.nombre.trim().toLowerCase() },
                {
                    $set: {
                        nombre: ingrediente.nombre.trim().toLowerCase(),
                        categoria: ingrediente.categoria || 'otros',
                        contenidoUnidad: ingrediente.contenidoUnidad,
                        unidadContenido: ingrediente.unidadContenido,
                        precioPromedio: ingrediente.precioPromedio,
                        preciosPorCadena: [
                            { supermercado: 'Lider',         precio: ingrediente.preciosPorCadena?.Lider        ?? 0 },
                            { supermercado: 'Jumbo',         precio: ingrediente.preciosPorCadena?.Jumbo        ?? 0 },
                            { supermercado: 'Unimarc',       precio: ingrediente.preciosPorCadena?.Unimarc      ?? 0 },
                            { supermercado: 'Santa Isabel',  precio: ingrediente.preciosPorCadena?.SantaIsabel  ?? 0 },
                            { supermercado: 'Tottus',        precio: ingrediente.preciosPorCadena?.Tottus       ?? 0 },
                            { supermercado: 'Mayorista',     precio: ingrediente.preciosPorCadena?.Mayorista    ?? 0 },
                            { supermercado: 'Feria Libre',   precio: ingrediente.preciosPorCadena?.FeriaLibre   ?? 0 }
                        ]
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        });

        await Promise.all(operaciones);
        return res.status(200).json({ mensaje: `Procesamiento completado. ${lista.length} ingrediente(s) guardado(s).` });

    } catch (error) {
        res.status(500).json({ error: "Error al procesar ingredientes.", detalle: error.message });
    }
};

exports.actualizarOMasivoRecetas = async (req, res) => {
    try {
        const datos = req.body;
        if (!Array.isArray(datos)) {
            return res.status(400).json({ error: "El cuerpo debe ser un arreglo [ ] de recetas." });
        }

        const operaciones = datos.map(receta => {
            return Receta.findOneAndUpdate(
                { nombre: receta.nombre.trim() },
                {
                    $set: {
                        nombre: receta.nombre.trim(),
                        categoria: receta.categoria,
                        formato: receta.formato,
                        edadMinimaMeses: receta.edadMinimaMeses,
                        alergenos: receta.alergenos || [],
                        descripcion: receta.descripcion || "Receta nutritiva recomendada para su desarrollo integral.",
                        componentesNutricionales: receta.componentesNutricionales,
                        pasos: receta.pasos || []
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        });

        await Promise.all(operaciones);
        return res.status(200).json({
            mensaje: `Base de datos actualizada. Se procesaron ${datos.length} recetas.`
        });

    } catch (error) {
        console.error("Error al actualizar recetas masivamente:", error);
        res.status(500).json({ error: "Error al actualizar recetas.", detalle: error.message });
    }
};