require('dotenv').config();
const mysql = require('mysql2');

// Creamos la "piscina" con los datos de tu servidor local
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Exportamos la promesa para poder usarla en otros archivos de forma moderna
module.exports = pool.promise();

// Prueba rápida de conexión
//pool.getConnection((err, connection) => {
 // if (err) {
//    console.error("❌ Error al conectar a la base de datos:", err.message);
 // } else {
 //   console.log("✅ ¡Conexión exitosa a MySQL!");
  //  connection.release(); // "Soltamos" la conexión de vuelta a la piscina
 // }
// });
