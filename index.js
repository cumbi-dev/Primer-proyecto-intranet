// 1. Importaciones
const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session'); // Movido aquí para orden
const db = require("./db"); // Conexión a la DB

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuración de la "memoria" del servidor (Sesiones)
app.use(session({
    secret: 'acceso concedido', // Frase secreta para cifrar las cookies
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // false porque no usamos HTTPS en localhost
}));

const port = 3000;

// --- FUNCIÓN PORTERO (Middleware de Seguridad) ---
function requiereLogin(req, res, next) {
    if (req.session.usuarioId) {
        // Si hay un ID en la sesión, el usuario está identificado. ¡Adelante!
        next(); 
    } else {
        // Si no hay sesión, lo mandamos al login
        res.redirect('/login.html');
    }
}

// --- 2. RUTA DE REGISTRO (POST) ---
app.post('/registro', async (req, res) => {
    const { nombre, correo, movil, password, dni } = req.body;

    // Porteros de Validación
    if (!nombre.includes(' ')) {
        return res.status(400).send("❌ Error: Debes introducir nombre y apellidos.");
    }
    if (!correo.endsWith('@gmail.com') && !correo.endsWith('@hotmail.com')) {
        return res.status(400).send("❌ Error: Solo se aceptan correos de @gmail.com o @hotmail.com.");
    }
    if (dni.length !== 9) {
        return res.status(400).send("❌ Error: El DNI debe tener exactamente 9 caracteres.");
    }

    try {
        const salt = bcrypt.genSaltSync(10);
        const passwordHasheada = bcrypt.hashSync(password, salt);

        const sql = 'INSERT INTO empleados (nombre, correo, movil, dni, password) VALUES (?, ?, ?, ?, ?)';
        await db.query(sql, [nombre, correo, movil, dni, passwordHasheada]);

        console.log(`✅ Empleado ${nombre} guardado.`);
        res.send(`¡Éxito! El empleado ${nombre} ha sido registrado. <br><a href="/login.html">Ir al Login</a>`);
    } catch (error) {
        console.error("❌ Error al registrar:", error.message);
        res.status(500).send("Hubo un problema al guardar los datos.");
    }
});

// --- 3. RUTA DE LOGIN (POST) ---
app.post('/login', async (req, res) => {
    const { correo, password } = req.body;
    try {
        const sql = 'SELECT * FROM empleados WHERE correo = ?';
        const [usuarios] = await db.query(sql, [correo]);

        if (usuarios.length === 0) {
            return res.status(401).send("❌ Error: Usuario no encontrado.");
        }

        const usuarioEncontrado = usuarios[0];
        const contraseñaCorrecta = bcrypt.compareSync(password, usuarioEncontrado.password);

        if (!contraseñaCorrecta) {
            return res.status(401).send("❌ Error: Contraseña incorrecta.");
        }

        // GUARDAMOS LA SESIÓN 🍪
        req.session.usuarioId = usuarioEncontrado.id;
        req.session.nombreUsuario = usuarioEncontrado.nombre;

        // Tras el éxito, lo mandamos directo al listado
        res.redirect('/empleados');
    } catch (error) {
        res.status(500).send("Error en el inicio de sesión.");
    }
});

// --- 4. RUTA DE LISTADO (GET) - VERSIÓN FINAL CON CSS EXTERNO Y BUSCADOR ---
app.get('/empleados', requiereLogin, async (req, res) => {
    // Capturamos lo que el usuario escribe en el buscador (si no hay nada, queda vacío '')
    const busqueda = req.query.q || ''; 

    try {
        let filas;
        // Lógica de búsqueda: Si hay texto, filtramos. Si no, traemos todo.
        if (busqueda) {
            const sql = "SELECT * FROM empleados WHERE nombre LIKE ? OR dni LIKE ?";
            [filas] = await db.query(sql, [`%${busqueda}%`, `%${busqueda}%`]);
        } else {
            [filas] = await db.query("SELECT * FROM empleados");
        }

        // 1. Cabecera del HTML y conexión al CSS externo
        let html = `
            <html>
            <head>
                <title>Panel de Empleados</title>
                <link rel="stylesheet" href="/estilos.css">
            </head>
            <body>
                <div class="header">
                    <h1>📋 Panel de la Intranet</h1>
                    <div>
                        <span>Hola, <b>${req.session.nombreUsuario}</b> | </span>
                        <a href="/logout" class="btn btn-logout">Cerrar Sesión</a>
                    </div>
                </div>
                
                <br>
                <a href="/registro.html" class="btn btn-nuevo">➕ Añadir Nuevo Empleado</a>

                <div class="buscador-container">
                    <form action="/empleados" method="GET" style="margin: 0; display: flex; gap: 10px; width: 100%;">
                        <input type="text" name="q" class="input-busqueda" placeholder="Buscar por nombre o DNI..." value="${busqueda}">
                        <button type="submit" class="btn" style="background-color: #343a40; color: white;">🔍 Buscar</button>
                        ${busqueda ? `<a href="/empleados" style="color: #dc3545; align-self: center; text-decoration: none; margin-left: 10px;">✖ Limpiar</a>` : ''}
                    </form>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre y Apellidos</th>
                            <th>Email</th>
                            <th>DNI</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // 2. Bucle para generar las filas de la tabla
        if (filas.length > 0) {
            filas.forEach(empleado => {
                html += `
                    <tr>
                        <td>${empleado.id}</td>
                        <td>${empleado.nombre}</td>
                        <td>${empleado.correo}</td>
                        <td>${empleado.dni}</td>
                        <td>
                            <a href="/editar/${empleado.id}" class="btn btn-edit">Editar</a>
                            <form action="/eliminar/${empleado.id}" method="POST" style="display:inline;">
                                <button type="submit" class="btn btn-borrar" onclick="return confirm('¿Estás seguro de eliminar a ${empleado.nombre}?')">Borrar</button>
                            </form>
                        </td>
                    </tr>
                `;
            });
        } else {
            // Mensaje si la búsqueda no arroja resultados
            html += `<tr><td colspan="5" style="text-align:center;">No se encontraron empleados con ese nombre o DNI.</td></tr>`;
        }

        // 3. Cierre de etiquetas
        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        res.send(html);

    } catch (error) {
        console.error("❌ Error en el listado:", error.message);
        res.status(500).send("Hubo un error al cargar la lista de empleados.");
    }
});

// --- 5. RUTA EDITAR (FORMULARIO) - PROTEGIDA 🔒 ---
app.get('/editar/:id', requiereLogin, async (req, res) => {
    const id = req.params.id;
    try {
        const [usuarios] = await db.query("SELECT * FROM empleados WHERE id = ?", [id]);
        const empleado = usuarios[0];
        let html = `
            <h2>Editar Empleado</h2>
            <form action="/actualizar/${empleado.id}" method="POST">
                Nombre: <input type="text" name="nombre" value="${empleado.nombre}"><br><br>
                Correo: <input type="email" name="correo" value="${empleado.correo}"><br><br>
                Móvil: <input type="text" name="movil" value="${empleado.movil}"><br><br>
                DNI: <input type="text" name="dni" value="${empleado.dni}"><br><br>
                <button type="submit">Guardar Cambios</button>
            </form>
            <br><a href="/empleados">Cancelar</a>
        `;
        res.send(html);
    } catch (error) {
        res.status(500).send("Error al cargar el formulario.");
    }
});

// --- 6. RUTA ACTUALIZAR (PROCESO) - PROTEGIDA 🔒 ---
app.post('/actualizar/:id', requiereLogin, async (req, res) => {
    const id = req.params.id;
    const { nombre, correo, movil, dni } = req.body;

    if (!nombre.includes(' ')) return res.status(400).send("❌ Error: Falta apellido.");
    if (!correo.endsWith('@gmail.com') && !correo.endsWith('@hotmail.com')) return res.status(400).send("❌ Error: Email no válido.");
    if (dni.length !== 9) return res.status(400).send("❌ Error: El DNI debe tener 9 caracteres.");

    try {
        const sql = "UPDATE empleados SET nombre = ?, correo = ?, movil = ?, dni = ? WHERE id = ?";
        await db.query(sql, [nombre, correo, movil, dni, id]);
        res.redirect('/empleados');
    } catch (error) {
        res.status(500).send("No se pudo actualizar.");
    }
});

// --- 7. RUTA ELIMINAR - PROTEGIDA 🔒 ---
app.post('/eliminar/:id', requiereLogin, async (req, res) => {
    try {
        await db.query("DELETE FROM empleados WHERE id = ?", [req.params.id]);
        res.redirect('/empleados');
    } catch (error) {
        res.status(500).send("Error al eliminar.");
    }
});

// --- 8. RUTA CERRAR SESIÓN ---
app.get('/logout', (req, res) => {
    req.session.destroy(); // Borramos la sesión
    res.redirect('/login.html'); // Al inicio
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});