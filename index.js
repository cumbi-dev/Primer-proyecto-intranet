// 1. Importamos la herramienta Express
const express = require('express');

// 2. Creamos la aplicación
const app = express();

// "Traductor" para que el servidor entienda los datos que vienen de formularios
app.use(express.urlencoded({ extended: true }));

// 3. Definimos el puerto
const port = 3000;

// 4. RUTA DE INICIO (GET): Solo para ver que el servidor está vivo
app.get('/', (req, res) => {
  res.send('¡Servidor de Intranet funcionando! 🚀');
});

// 5. RUTA DE REGISTRO (POST): Para recibir los datos del nuevo empleado
app.post('/registro', (req, res) => {
  // Extraemos cada dato del "sobre" (req.body)
  const nombre = req.body.nombre;
  const correo = req.body.correo;
  const movil = req.body.movil;
  const password = req.body.password; // Usamos 'password' para la contraseña
  const dni = req.body.dni;

  // Mostramos los datos en la terminal para confirmar que llegaron
  console.log("=== Nuevo Registro Recibido ===");
  console.log("Nombre:", nombre);
  console.log("Email:", correo);
  console.log("Móvil:", movil);
  console.log("DNI:", dni);
  // Por seguridad, es mejor no mostrar la contraseña real en la terminal
  console.log("Contraseña: [RECIBIDA Y PROTEGIDA]"); 

  // Respondemos al navegador
  res.send(`¡Gracias ${nombre}! Tu solicitud de registro con el DNI ${dni} ha sido recibida.`);
});

// 6. Arrancamos el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});