const Receta = require('../models/Receta');
const IngredientPrice = require('../models/IngredientPrice');

// --- FUNCIONES AUXILIARES INTERNAS ---
function obtenerTodosLosIngredientes(receta) {
  const lista = [];
  if (receta && receta.componentesNutricionales) {
    const grupos = ['carbohidratos', 'vegetales', 'proteinas', 'acidosGrasos'];
    grupos.forEach(grupo => {
      if (receta.componentesNutricionales[grupo] && Array.isArray(receta.componentesNutricionales[grupo])) {
        lista.push(...receta.componentesNutricionales[grupo]);
      }
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

  let estadoNutricional = "Normopeso";
  const tallaMetros = tallaCm / 100;
  const imc = (pesoKg / (tallaMetros * tallaMetros)).toFixed(1);

  if (imc < 14) estadoNutricional = "Bajo Peso";
  else if (imc >= 17 && imc < 19) estadoNutricional = "Sobrepeso";
  else if (imc >= 19) estadoNutricional = "Obesidad";

  return {
    caloriasMeta: caloriasTotalesMeta,
    liquidosMeta: liquidosTotalesMeta,
    evaluacionBiometrica: { imcCalculado: parseFloat(imc), estadoNutricional }
  };
}

// --- CONTROLADORES PRINCIPALES ---

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
        const { edadMeses, pesoKg, sexoBiologico, tallaCm, alergias, formatoAlimentacion, mercaderiaEnCasa, cantidadDias } = req.body;

        if (!edadMeses || !pesoKg || !sexoBiologico || !tallaCm) {
            return res.status(400).json({ mensaje: "Faltan datos biométricos obligatorios." });
        }

        const infoNutricionalBebe = calcularRequerimientosNutricionales(edadMeses, pesoKg, sexoBiologico, tallaCm);

        // 🔥 CORRECCIÓN CRÍTICA: Se cambia 'formatoAlimentacion' por 'formato' que es el campo real en MongoDB
        const queryFiltros = {
            edadMinimaMeses: { $lte: edadMeses }
        };

        if (formatoAlimentacion && formatoAlimentacion !== 'Mixto') {
            queryFiltros.formato = formatoAlimentacion;
        }
        if (alergias && alergias.length > 0) {
            queryFiltros.alergenos = { $nin: alergias };
        }

        const recetasDisponibles = await Receta.find(queryFiltros);

        if (recetasDisponibles.length === 0) {
            return res.status(404).json({ mensaje: "No se encontraron recetas que coincidan con los filtros." });
        }

        // Separación por categorías reales de tu Base de Datos ('principal', 'desayuno', 'colacion', 'postre')
        const principales = recetasDisponibles.filter(r => r.categoria === 'principal');
        const desayunos = recetasDisponibles.filter(r => r.categoria === 'desayuno');
        const colaciones = recetasDisponibles.filter(r => r.categoria === 'colacion');
        const postres = recetasDisponibles.filter(r => r.categoria === 'postre');

        const todosDias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const numDias = (cantidadDias && cantidadDias >= 1 && cantidadDias <= 7) ? parseInt(cantidadDias) : 7;
        const dias = todosDias.slice(0, numDias);
        const menuSemanalRaw = {};

        // Función segura de selección aleatoria
        const obtenerAleatorio = (arr) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

        dias.forEach(dia => {
            menuSemanalRaw[dia] = {
                almuerzo: obtenerAleatorio(principales),
                desayuno: obtenerAleatorio(desayunos),
                colacionTarde: obtenerAleatorio(colaciones),
                postre: obtenerAleatorio(postres)
            };
        });

        // 🍳 PROCESAMIENTO Y FORMATEO DE RECETAS ENVIADAS AL FRONTEND
        const menuSemanalFormateado = {};
        const todosLosIngredientesDelMenu = [];

        for (const dia in menuSemanalRaw) {
            menuSemanalFormateado[dia] = {};
            ['almuerzo', 'desayuno', 'colacionTarde', 'postre'].forEach(subCat => {
                const recetaOriginal = menuSemanalRaw[dia][subCat];
                if (recetaOriginal) {
                    const listaIngredientesUnificada = obtenerTodosLosIngredientes(recetaOriginal);
                    todosLosIngredientesDelMenu.push(...listaIngredientesUnificada);

                    // Devolvemos una estructura limpia y fácil de procesar por app.js
                    menuSemanalFormateado[dia][subCat] = {
                        _id: recetaOriginal._id,
                        nombre: recetaOriginal.nombre,
                        categoria: recetaOriginal.categoria,
                        formato: recetaOriginal.formato,
                        descripcion: recetaOriginal.descripcion || "Receta nutritiva recomendada para su desarrollo integral.",
                        pasos: recetaOriginal.pasos || [],
                        ingredientes: listaIngredientesUnificada.map(i => ({
                            nombre: i.nombre,
                            cantidad: i.cantidad || ''
                        }))
                    };
                } else {
                    menuSemanalFormateado[dia][subCat] = null;
                }
            });
        }

        // --- MÓDULO DE FINANZAS Y SUPERMERCADOS ---
        const despensaSet = new Set((mercaderiaEnCasa || []).map(i => i.trim().toLowerCase()));
        const ingredientesAComprar = todosLosIngredientesDelMenu.filter(ing => !despensaSet.has(ing.nombre.trim().toLowerCase()));

        const nombresUnicosAComprar = [...new Set(ingredientesAComprar.map(i => i.nombre.trim().toLowerCase()))];
        const infoPreciosIngredientes = await IngredientPrice.find({ nombre: { $in: nombresUnicosAComprar } });

        const mapaPrecios = {};
        infoPreciosIngredientes.forEach(ing => {
            mapaPrecios[ing.nombre.toLowerCase()] = ing;
        });

        let gastoSemanalCalculado = 0;
        let dineroAhorradoSemanal = 0;
        const listaDeComprasDetallada = [];

        const totalesAcumulados = { Lider: 0, Jumbo: 0, Unimarc: 0 };

        nombresUnicosAComprar.forEach(nombreIng => {
            const coincidencias = ingredientesAComprar.filter(i => i.nombre.trim().toLowerCase() === nombreIng);
            // Consolidar cantidades: agrupar las que tienen valor numérico + unidad, descartar duplicados vacíos
            const cantidadesValidas = coincidencias.map(c => c.cantidad).filter(c => c && c.trim() !== '');
            const cantidadesUnicas = [...new Set(cantidadesValidas)];
            const cantidadTotalTexto = cantidadesUnicas.length > 0 ? cantidadesUnicas.join(' + ') : 'Al gusto';

            const precioData = mapaPrecios[nombreIng];
            let precioLider = 0, precioJumbo = 0, precioUnimarc = 0, precioRef = 0;

            if (precioData) {
                precioRef = precioData.precioPromedio || 0;
                if (precioData.preciosPorCadena && precioData.preciosPorCadena.length > 0) {
                    precioData.preciosPorCadena.forEach(p => {
                        if (p.supermercado === 'Lider') precioLider = p.precio;
                        if (p.supermercado === 'Jumbo') precioJumbo = p.precio;
                        if (p.supermercado === 'Unimarc') precioUnimarc = p.precio;
                    });
                }
            }

            const precioFallback = precioRef > 0 ? precioRef : 1200;
            if (precioLider === 0) precioLider = precioRef > 0 ? precioRef : 1200;
            if (precioJumbo === 0) precioJumbo = precioRef > 0 ? Math.round(precioRef * 1.15) : 1400;
            if (precioUnimarc === 0) precioUnimarc = precioRef > 0 ? Math.round(precioRef * 1.05) : 1300;

            totalesAcumulados.Lider += precioLider;
            totalesAcumulados.Jumbo += precioJumbo;
            totalesAcumulados.Unimarc += precioUnimarc;

            gastoSemanalCalculado += precioFallback;

            listaDeComprasDetallada.push({
                ingrediente: nombreIng,
                cantidad: cantidadTotalTexto || 'Al gusto',
                preciosPorCadena: { Lider: precioLider, Jumbo: precioJumbo, Unimarc: precioUnimarc }
            });
        });

        // Ahorro real = precio de los ingredientes que ya tienes en casa (despensa)
        const ingredientesEnDespensa = todosLosIngredientesDelMenu.filter(ing => despensaSet.has(ing.nombre.trim().toLowerCase()));
        const nombresUnicosDespensa = [...new Set(ingredientesEnDespensa.map(i => i.nombre.trim().toLowerCase()))];
        const infoPreciosDespensa = await IngredientPrice.find({ nombre: { $in: nombresUnicosDespensa } });
        infoPreciosDespensa.forEach(data => {
            dineroAhorradoSemanal += (data.precioPromedio || 1200);
        });

        res.status(200).json({
            infoNutricionalBebe,
            menuSemanal: menuSemanalFormateado,
            gastoSemanalCalculado: Math.round(gastoSemanalCalculado),
            dineroAhorradoSemanal: Math.round(dineroAhorradoSemanal),
            finanzasSupermercados: {
                totalesAcumulados: {
                    Lider: Math.round(totalesAcumulados.Lider),
                    Jumbo: Math.round(totalesAcumulados.Jumbo),
                    Unimarc: Math.round(totalesAcumulados.Unimarc)
                },
                listaDeCompras: listaDeComprasDetallada
            }
        });

    } catch (error) {
        console.error("🚨 Error grave en el Algoritmo del Menú:", error);
        res.status(500).json({ error: "Error en el servidor al procesar el menú.", detalle: error.message });
    }
};

exports.crearIngrediente = async (req, res) => {
    try {
        const datos = req.body;
        if (Array.isArray(datos)) {
            const operaciones = datos.map(ingrediente => {
                return IngredientPrice.findOneAndUpdate(
                    { nombre: ingrediente.nombre.trim().toLowerCase() },
                    {
                        $set: {
                            nombre: ingrediente.nombre.trim().toLowerCase(),
                            categoria: ingrediente.categoria || 'otros',
                            precioPromedio: ingrediente.precioPromedio,
                            preciosPorCadena: [
                                { supermercado: "Lider", precio: ingrediente.preciosPorCadena.Lider },
                                { supermercado: "Jumbo", precio: ingrediente.preciosPorCadena.Jumbo },
                                { supermercado: "Unimarc", precio: ingrediente.preciosPorCadena.Unimarc }
                            ]
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            });
            await Promise.all(operaciones);
            return res.status(200).json({ mensaje: `🎉 Procesamiento completado. Se crearon e ingresaron ingredientes correctamente.` });
        } else {
            const resultado = await IngredientPrice.findOneAndUpdate(
                { nombre: datos.nombre.trim().toLowerCase() },
                { $set: datos },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return res.status(200).json({ mensaje: "✅ Ingrediente procesado de forma individual.", data: resultado });
        }
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor al procesar la lista.", detalle: error.message });
    }
};

// RUTA NUEVA ACTUALIZADA: Para sobrescribir recetas sin perder alérgenos ni descripciones
exports.actualizarOMasivoRecetas = async (req, res) => {
    try {
        const datos = req.body;

        if (Array.isArray(datos)) {
            const operaciones = datos.map(receta => {
                return Receta.findOneAndUpdate(
                    { nombre: receta.nombre.trim() },
                    {
                        $set: {
                            nombre: receta.nombre.trim(),
                            categoria: receta.categoria,
                            formato: receta.formato,
                            edadMinimaMeses: receta.edadMinimaMeses,
                            alergenos: receta.alergenos || [], // ✨ Conserva y añade los alérgenos enviados
                            descripcion: receta.descripcion || "Receta nutritiva recomendada para su desarrollo integral.", // ✨ Conserva la descripción
                            componentesNutricionales: receta.componentesNutricionales,
                            pasos: receta.pasos || []
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            });

            await Promise.all(operaciones);
            return res.status(200).json({ 
                mensaje: `🎉 Base de datos sobrescrita con éxito. Se procesaron ${datos.length} recetas de manera segura.` 
            });
        } else {
            return res.status(400).json({ error: "El cuerpo de la petición debe ser un arreglo [ ] de recetas." });
        }
    } catch (error) {
        console.error("🚨 Error al sobrescribir recetas:", error);
        res.status(500).json({ error: "Error en el servidor al actualizar las recetas.", detalle: error.message });
    }
};