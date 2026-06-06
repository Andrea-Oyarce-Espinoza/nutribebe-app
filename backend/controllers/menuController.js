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

  const proteinasGramos = Math.round((caloriasTotalesMeta * 0.12) / 4);     
  const carbohidratosGramos = Math.round((caloriasTotalesMeta * 0.50) / 4); 
  const grasasGramos = Math.round((caloriasTotalesMeta * 0.38) / 9);         

  let estadoNutricional = "Desarrollo Normal";
  if (edadMeses === 12 && pesoKg < 7.5) estadoNutricional = "Bajo Peso (Sugerir control médico)";
  if (edadMeses === 12 && pesoKg > 12.5) estadoNutricional = "Sobrepeso (Sugerir evaluación)";

  return {
    caloriasMeta: caloriasTotalesMeta,
    liquidosMeta: liquidosTotalesMeta,
    macrosMeta: { proteinasGramos, carbohidratosGramos, grasasGramos },
    evaluacionBiometrica: {
      estadoNutricional,
      imcCalculado: (pesoKg / ((tallaCm / 100) * (tallaCm / 100))).toFixed(1)
    }
  };
}

// --- CONTROLADORES DE RUTA ---

// 1. Obtener todas las recetas con sus cálculos de precios base
exports.obtenerRecetas = async (req, res) => {
  try {
    const recetasDesdeAtlas = await Receta.find();
    
    const recetasConPrecio = recetasDesdeAtlas.map(receta => {
      let costoTotalReceta = 0;
      const todosLosIngredientes = obtenerTodosLosIngredientes(receta);
      
      todosLosIngredientes.forEach(ing => {
        if (ing && ing.nombre) {
          costoTotalReceta += PRECIOS_MERCADO_CHILE[ing.nombre] || 500;
        }
      });
      return {
        ...receta.toObject(),
        presupuestoEstimadoCLP: costoTotalReceta
      };
    });
    res.json(recetasConPrecio);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener recetas', error });
  }
};

// 2. Guardar nueva receta en MongoDB Atlas
exports.crearReceta = async (req, res) => {
  try {
    const nuevaReceta = new Receta(req.body);
    await nuevaReceta.save();
    res.status(201).json({ mensaje: '¡Receta guardada con éxito en la nube!', receta: nuevaReceta });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al guardar en Atlas', error });
  }
};

// 3. Generar menú personalizado inteligente semanal
exports.generarMenuPersonalizado = async (req, res) => {
  try {
    const { edadMeses, sexoBiologico, pesoKg, tallaCm, alergias, presupuestoMaximoCLP, mercaderiaEnCasa, formatoAlimentacion } = req.body;
    const despensaUsuario = mercaderiaEnCasa || [];

    const perfilNutricional = calcularRequerimientosNutricionales(edadMeses, pesoKg, sexoBiologico, tallaCm);
    
    const [recetasDesdeAtlas, listaPreciosBD] = await Promise.all([
      Receta.find(), 
      IngredientPrice.find()
    ]);

    const mapaPrecios = {};
    listaPreciosBD.forEach(item => {
      mapaPrecios[item.nombre.toLowerCase().trim()] = item.precioPromedio;
    });

    const recetasAptas = recetasDesdeAtlas.map(receta => {
      let costo = 0;
      const todosLosIngredientes = obtenerTodosLosIngredientes(receta);
      
      todosLosIngredientes.forEach(ing => {
        if (ing && ing.nombre) {
          const nombreIngrediente = ing.nombre.toLowerCase().trim();

          // Si el usuario NO lo tiene en su despensa, calculamos el costo
          if (!despensaUsuario.includes(ing.nombre)) {
            // Buscamos en el mapa de la BD; si no existe el ingrediente, usamos 500 como salvavidas
            costo += mapaPrecios[nombreIngrediente] || 500;
          }
        }      
      });
      return { ...receta.toObject(), presupuestoEstimadoCLP: costo };
    }).filter(receta => {
      // 1. Filtro de Edad Seguro
      const edadMin = receta.edadMinimaMeses !== undefined ? receta.edadMinimaMeses : 6;
      if (edadMeses < edadMin) return false;
      
      // 2. Filtro de Alérgenos
      if (alergias && alergias.length > 0 && receta.alergenos) {
        const esAlergico = receta.alergenos.some(alergene => alergias.includes(alergene));
        if (esAlergico) return false;
      }

      // 3. Filtro: Formato de Alimentación (BLW / Papilla / Mixto)
      const formatoReceta = receta.formato || 'Mixto';
      if (formatoAlimentacion && formatoAlimentacion !== 'Mixto') {
        if (formatoReceta !== 'Mixto' && formatoReceta !== formatoAlimentacion){
          return false;
        }
      }
      return true; // <-- Permitir que la receta pase si cumple los filtros
    });

    const principales = recetasAptas.filter(r => r.categoria === 'principal');
    const desayunos = recetasAptas.filter(r => r.categoria === 'desayuno');
    const colaciones = recetasAptas.filter(r => r.categoria === 'colacion');
    const postres = recetasAptas.filter(r => r.categoria === 'postre');

    if (principales.length === 0) {
      return res.status(404).json({ 
        mensaje: "No se encontraron recetas principales aptas para construir el almuerzo y cena del menú."
      });
    }

    const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const calendarioMenu = {};
    let gastoTotalSemana = 0;

    diasSemana.forEach((dia, index) => {
      const almuerzoCena = principales[index % principales.length] || principales[0];
      const desayunoDia = desayunos[index % desayunos.length] || null;
      const colacionDia = colaciones[index % colaciones.length] || null;
      const postreDia = postres[index % postres.length] || null;

      const costoAlmuerzoCenaTotal = (almuerzoCena.presupuestoEstimadoCLP || 0) * 2;
      const costoDesayuno = desayunoDia ? (desayunoDia.presupuestoEstimadoCLP || 0) : 0;
      const costoColacion = colacionDia ? (colacionDia.presupuestoEstimadoCLP || 0) : 0;
      const costoPostre = postreDia ? (postreDia.presupuestoEstimadoCLP || 0) : 0;

      const costoDiario = costoAlmuerzoCenaTotal + costoDesayuno + costoColacion + costoPostre;
      gastoTotalSemana += costoDiario;

      calendarioMenu[dia] = {
        desayuno: desayunoDia,
        almuerzo: almuerzoCena,
        cena: almuerzoCena,    
        colacionTarde: colacionDia,
        postre: postreDia,
        costoDiarioCalculado: costoDiario
      };
    });

    const presupuestoSemanalUsuario = presupuestoMaximoCLP * 7;
    const dineroAhorradoSemana = Math.max(0, presupuestoSemanalUsuario - gastoTotalSemana);

    res.json({
      success: true,
      infoNutricionalBebe: perfilNutricional,
      gastoSemanalCalculado: gastoTotalSemana,
      dineroAhorradoSemanal: dineroAhorradoSemana,
      menuSemanal: calendarioMenu
    });

  } catch (error) {
    console.error("Error al procesar el menú:", error);
    res.status(500).json({ mensaje: 'Error al procesar el menú', error: error.message });
  }
};