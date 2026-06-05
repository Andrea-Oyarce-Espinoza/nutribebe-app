const mongoose = require('mongoose');

const conectarDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('¡CONEXIÓN EXITOSA Y SEGURA A MONGO DB ATLAS! 🚀');
    } catch (err) {
        console.error('Error al conectar a MongoDB:', err);
        process.exit(1); // Detiene la app si falla la conexión crítica
    }
};

module.exports = conectarDB;