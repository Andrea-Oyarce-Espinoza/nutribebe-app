const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// Rutas mapeadas semánticamente
router.get('/recetas', menuController.obtenerRecetas);
router.post('/recetas', menuController.crearReceta);
router.post('/menu-personalizado', menuController.generarMenuPersonalizado);

module.exports = router;