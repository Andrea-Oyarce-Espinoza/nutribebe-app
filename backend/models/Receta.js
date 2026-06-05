const mongoose = require('mongoose'); 

const recetaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  categoria: { 
    type: String, 
    enum: ['principal', 'desayuno', 'colacion', 'postre'], 
    required: true 
  },
  formato: { 
    type: String, 
    enum: ['BLW', 'Papilla', 'Mixto'], 
    required: true  // Ahora conviven ambos campos perfectamente
  }, 
  edadMinimaMeses: { type: Number, required: true }, 
  alergenos: [String], 
  componentesNutricionales: {
    carbohidratos: [{ nombre: String, cantidad: String }],
    vegetales: [{ nombre: String, cantidad: String }],
    proteinas: [{ nombre: String, cantidad: String }],
    acidosGrasos: [{ nombre: String, cantidad: String }]
  },
  pasos: [String] 
}); 

module.exports = mongoose.model('Receta', recetaSchema);