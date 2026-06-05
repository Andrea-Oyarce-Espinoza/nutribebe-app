// Solo busca el archivo .env si estamos trabajando en modo local (desarrollo)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares Globales
app.use(express.json());
app.use(cors());

// Conectar Base de Datos
conectarDB();

// Registro Central de Rutas API
app.use('/api', require('./routes/menuRoutes'));

// Inicialización del Servidor
app.use(express.json());
app.listen(PORT, () => {
  console.log(`🚀 Servidor e-commerce listo y protegido corriendo en el puerto ${PORT}`);
});