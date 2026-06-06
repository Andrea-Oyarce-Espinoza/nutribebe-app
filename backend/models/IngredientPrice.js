const mongoose = require('mongoose');

const SupermarketPriceSchema = new mongoose.Schema({
    supermercado: {
        type: String, 
        required: true,
        enum: ['Lider', 'Jumbo', 'Unimarc', 'Santa Isabel', 'Mayorista', 'Feria']
    }, 
    precio: { type: Number, required: true },
    unidadMedida: { type: String, default: 'un' }, // 'g', 'ml', 'un', 'kg'
    fechaActualizacion: { type: Date, default: Date.now }
}); 

const IngredientPriceSchema = new mongoose.Schema({
    nombre: {
        type: String, 
        required: true,
        unique: true, 
        lowercase: true, 
        trim: true
    }, 
    categoria: { type: String, default: 'otros' }, // 'verduras', 'carnes', 'lacteos', etc.
    precioPromedio: { type: Number, required: true }, // Precio por defecto para el cálculo general
    preciosPorCadena: [SupermarketPriceSchema] // Detalle opcional por si el usuario quiere cotizar
}, { timestamps: true });

module.exports = mongoose.model('IngredientPrice', IngredientPriceSchema);