const mongoose = require('mongoose');
const IngredientPrice = require('../models/IngredientPrice');
require('dotenv').config(); // Para leer MONGO_URI

const ingredientesIniciales = [
    {
        nombre: "leche entera 1l", 
        categoria: "lacteos", 
        precioPromedio: 1050, 
        preciosPorCadena: [
            { supermercado: "Lider", precio: 990 },
            { supermercado: "Jumbo", precio: 1150 },
            { supermercado: "Unimarc", precio: 1020 }
        ]
    },
    {
        nombre: "yogurt natural 125g", 
        categoria: "lacteos", 
        precioPromedio: 330,
        preciosPorCadena: [
            { supermercado: "Lider", precio: 290 },
            { supermercado: "Jumbo", precio: 370 }, 
            { supermercado: "Unimarc", precio: 330 }
        ]
    },
    {
        nombre: "pechuga de pollo kg",
        categoria: "carnes", 
        precioPromedio: 4800, 
        preciosPorCadena: [
            { supermercado: "Lider", precio: 4590 },
            { supermercado: "Jumbo", precio: 5190 },
            { supermercado: "Unimarc", precio: 4790 }
        ]
    },
    {
        nombre: "platano un", 
        categoria: "frutas", 
        precioPromedio: 250, 
        preciosPorCadena: [
            { supermercado: "Lider", precio: 220 },
            { supermercado: "Jumbo", precio: 290 },
            { supermercado: "Unimarc", precio: 180 }
        ]
    },
    {
        nombre: "manzana un", 
        categoria: "frutas", 
        precioPromedio: 300, 
        preciosPorCadena: [
            { supermercado: "Lider", precio: 280 },
            { supermercado: "Jumbo", precio: 350 }, 
            { supermercado: "Unimarc", precio: 220 }
        ]
    },
    {
        nombre: "pera un", 
        categoria: "frutas", 
        precioPromedio: 280,
        preciosPorCadena: [
            { supermercado: "Lider", precio: 260 }, 
            { supermercado: "Jumbo", precio: 320 }, 
            { supermercado: "Unimarc", precio: 200 }
        ]
    },
    {
        nombre: "zanahoria un", 
        categoria: "verduras", 
        precioPromedio: 150,
        preciosPorCadena: [
            { supermercado: "Lider", precio: 140 },
            { supermercado: "Jumbo", precio: 180 }, 
            { supermercado: "Unimarc", precio: 100 }
        ]
    }, 
    {
        nombre: "zapallo camote 1kg", 
        categoria: "verduras", 
        precioPromedio: 1500, 
        preciosPorCadena: [
            { supermercado: "Lider", precio: 1390 }, 
            { supermercado: "Jumbo", precio: 1690 }, 
            { supermercado: "Feria", precio: 1100 }
        ]
    }, 
    {
        nombre: "espinaca mata", 
        categoria: "verduras", 
        precioPromedio: 800, 
        preciosPorCadena: [
            { supermercado: "Lider", precio: 890 }, 
            { supermercado: "Jumbo", precio: 990 }, 
            { supermercado: "Unimarc", precio: 500 }
        ]
    }, 
    {
        nombre: "avena instantanea 500g", 
        categoria: "cereales", 
        precioPromedio: 1200, 
        preciosPorCadena: [
            { supermercado: "Lider", precio: 1090 }, 
            { supermercado: "Jumbo", precio: 1350 }, 
            { supermercado: "Unimarc", precio: 1190 }
        ]
    },
    { 
        nombre: "huevo un", 
        categoria: "otros", 
        precioPromedio: 250,
        preciosPorCadena: [
            { supermercado: "Lider", precio: 240 }, 
            { supermercado: "Jumbo", precio: 280 }, 
            { supermercado: "Unimarc", precio: 200}
        ]
    }
];