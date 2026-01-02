const mysql = require('mysql2/promise');

// Creamos la conexión usando "Variables de Entorno"
// Si existen las llaves del servidor, las usa. Si no, usa las de tu PC (localhost).
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '1234',
  database: process.env.MYSQLDATABASE || 'intranet_db',
  port: process.env.MYSQLPORT || 3306
});

module.exports = pool;