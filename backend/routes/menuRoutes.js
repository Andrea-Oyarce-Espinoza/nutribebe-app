const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');


// Rutas para las Recetas 
router.get('/recetas', menuController.obtenerRecetas);
router.post('/recetas', menuController.crearReceta);

// RUTA NUEVA: Para manejar los ingredientes desde Thunder Client 
router.post('/ingredientes', menuController.crearIngrediente);

// Ruta para el Algoritmo 
router.post('/menu-personalizado', menuController.generarMenuPersonalizado);

// Agrega esta línea junto a las demás rutas de recetas
router.post('/recetas/actualizacion-masiva', menuController.actualizarOMasivoRecetas);

module.exports = router;
