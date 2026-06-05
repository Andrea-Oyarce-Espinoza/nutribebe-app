// Solo busca el archivo .env si estamos trabajando en modo local (desarrollo)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const conectarDB = async () => {
  // Manejador dinámico interno
  const db = require('./config/db');
  await db();
};

const app = express();
const PORT = process.env.PORT || 5000;

// Conectar Base de Datos
conectarDB();

// Middlewares Globales
app.use(express.json());
app.use(cors());

// Registro Central de Rutas API
app.use('/api', require('./routes/menuRoutes'));

// Inicialización del Servidor
app.use(express.json());
app.listen(PORT, () => {
  console.log(`🚀 Servidor e-commerce listo y protegido corriendo en el puerto ${PORT}`);
});