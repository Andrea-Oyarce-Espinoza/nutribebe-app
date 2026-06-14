const mongoose = require('mongoose');

const SupermarketPriceSchema = new mongoose.Schema({
    supermercado: {
        type: String, 
        required: true,
        enum: ['Lider', 'Jumbo', 'Unimarc', 'Santa Isabel', 'Tottus', 'Mayorista', 'Feria Libre']
    }, 
    precio: { type: Number, required: true },
    
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
    categoria: { type: String, default: 'otros' }, 
    contenidoUnidad: { type: Number, required: true, default: 1 }, unidadContenido: { type: String, enum: ['g', 'kg', 'ml', 'l', 'un', 'atado' ], default: 'g' },
    precioPromedio: { type: Number, required: true }, 
    preciosPorCadena: [SupermarketPriceSchema] 
}, { timestamps: true });

module.exports = mongoose.model('IngredientPrice', IngredientPriceSchema);