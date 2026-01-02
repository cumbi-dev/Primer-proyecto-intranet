const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    // 🔑 OPCIÓN A: Si en Workbench entras SIN contraseña, deja esto así: ''
    // 🔑 OPCIÓN B: Si usas contraseña, escríbela aquí: 'tu_password'
    password: '1234', 
    database: 'intranet_db', 
    port: 3306 
});

module.exports = pool;