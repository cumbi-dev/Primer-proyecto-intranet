// 1. Importaciones
const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require("./db"); 
const path = require('path'); // Herramienta para gestionar rutas de archivos

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(express.urlencoded({ extended: true }));

// ✅ MEJORA: Definimos la carpeta 'public' de forma absoluta para evitar fallos en la nube
app.use(express.static(path.join(__dirname, 'public'))); 

app.use(session({
    secret: 'acceso concedido', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// Puerto dinámico para Railway
const PORT = process.env.PORT || 3000;

// --- FUNCIONES PORTERO (Middlewares de Seguridad) ---

function requiereLogin(req, res, next) {
    if (req.session.usuarioId) {
        next(); 
    } else {
        // Si no está logueado, lo mandamos al login
        res.redirect('/login');
    }
}

function requiereAdmin(req, res, next) {
    if (req.session.rol === 'admin') {
        next(); 
    } else {
        res.status(403).send("🚫 Acceso Denegado: Solo los administradores pueden realizar esta acción.");
    }
}

// --- RUTAS DE NAVEGACIÓN (Evitan el "Cannot GET") ---

// ✅ MEJORA: Si entra a la raíz o a /login, le servimos el archivo físico directamente
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- RUTAS DE ACCESO ---

app.get('/nuevo-empleado', requiereLogin, requiereAdmin, (req, res) => {
    // ✅ MEJORA: Ruta absoluta para la carpeta privado
    res.sendFile(path.join(__dirname, 'privado', 'registro.html')); 
});

// --- RUTA DE LOGIN (POST) ---
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

        req.session.usuarioId = usuarioEncontrado.id;
        req.session.nombreUsuario = usuarioEncontrado.nombre;
        req.session.rol = usuarioEncontrado.rol; 

        res.redirect('/empleados');
    } catch (error) {
        res.status(500).send("Error en el inicio de sesión.");
    }
});

// --- RUTA DE LISTADO (GET) ---
app.get('/empleados', requiereLogin, async (req, res) => {
    const busqueda = req.query.q || ''; 
    const rolUsuario = req.session.rol; 
    const alerta = req.session.mensaje;
    delete req.session.mensaje; 

    try {
        let filas;
        if (busqueda) {
            const sql = "SELECT * FROM empleados WHERE nombre LIKE ? OR dni LIKE ?";
            [filas] = await db.query(sql, [`%${busqueda}%`, `%${busqueda}%`]);
        } else {
            [filas] = await db.query("SELECT * FROM empleados");
        }

        let html = `
            <html>
            <head>
                <title>Panel de Empleados</title>
                <link rel="stylesheet" href="/estilos.css">
                <style>
                    .alerta { padding: 15px; margin-bottom: 20px; border-radius: 5px; font-weight: bold; text-align: center; font-family: Arial, sans-serif; }
                    .exito { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                    .borrado { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 Panel de la Intranet</h1>
                    <div>
                        <span>Hola, <b>${req.session.nombreUsuario}</b> (${rolUsuario}) | </span>
                        <a href="/logout" class="btn btn-logout">Cerrar Sesión</a>
                    </div>
                </div>
                <br>
                ${alerta ? `<div class="alerta ${alerta.tipo}">${alerta.texto}</div>` : ''}
                ${rolUsuario === 'admin' ? '<a href="/nuevo-empleado" class="btn btn-nuevo">➕ Añadir Nuevo Empleado</a>' : ''}
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
                            <th>ID</th><th>Nombre y Apellidos</th><th>Email</th><th>DNI</th><th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (filas.length > 0) {
            filas.forEach(empleado => {
                let accionesHtml = (rolUsuario === 'admin') ? `
                    <a href="/editar/${empleado.id}" class="btn btn-edit">Editar</a>
                    <form action="/eliminar/${empleado.id}" method="POST" style="display:inline;">
                        <button type="submit" class="btn btn-borrar" onclick="return confirm('¿Eliminar a ${empleado.nombre}?')">Borrar</button>
                    </form>
                ` : '<span style="color: gray; font-style: italic;">Solo lectura</span>';

                html += `
                    <tr>
                        <td>${empleado.id}</td><td>${empleado.nombre}</td><td>${empleado.correo}</td><td>${empleado.dni}</td><td>${accionesHtml}</td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="5" style="text-align:center;">No se encontraron empleados.</td></tr>`;
        }

        html += `</tbody></table></body></html>`;
        res.send(html);
    } catch (error) {
        res.status(500).send("Hubo un error al cargar la lista.");
    }
});

// --- RUTA DE REGISTRO (POST) ---
app.post('/registro', requiereLogin, requiereAdmin, async (req, res) => {
    const { nombre, correo, movil, password, dni } = req.body;
    if (!nombre.includes(' ')) return res.status(400).send("❌ Error: Falta apellido.");
    if (dni.length !== 9) return res.status(400).send("❌ Error: DNI incorrecto.");

    try {
        const sqlCheck = 'SELECT * FROM empleados WHERE correo = ? OR dni = ?';
        const [existentes] = await db.query(sqlCheck, [correo, dni]);

        if (existentes.length > 0) {
            let motivo = existentes[0].correo === correo ? "el correo" : "el DNI";
            return res.status(400).send(`❌ Error: Ya existe un empleado registrado con ${motivo}.`);
        }

        const salt = bcrypt.genSaltSync(10);
        const passwordHasheada = bcrypt.hashSync(password, salt);
        const sqlInsert = 'INSERT INTO empleados (nombre, correo, movil, dni, password) VALUES (?, ?, ?, ?, ?)';
        await db.query(sqlInsert, [nombre, correo, movil, dni, passwordHasheada]);
        res.send(`¡Éxito! ${nombre} ha sido registrado. <br><a href="/empleados">Volver al panel</a>`);
    } catch (error) {
        res.status(500).send("Hubo un problema interno en el servidor.");
    }
});

// --- RUTA EDITAR (FORMULARIO) ---
app.get('/editar/:id', requiereLogin, requiereAdmin, async (req, res) => {
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

// --- RUTA ACTUALIZAR (PROCESO) ---
app.post('/actualizar/:id', requiereLogin, requiereAdmin, async (req, res) => {
    const id = req.params.id;
    const { nombre, correo, movil, dni } = req.body;
    try {
        const sql = "UPDATE empleados SET nombre = ?, correo = ?, movil = ?, dni = ? WHERE id = ?";
        await db.query(sql, [nombre, correo, movil, dni, id]);
        req.session.mensaje = { texto: "✅ Empleado actualizado con éxito", tipo: "exito" };
        res.redirect('/empleados');
    } catch (error) {
        res.status(500).send("No se pudo actualizar.");
    }
});

// --- RUTA ELIMINAR ---
app.post('/eliminar/:id', requiereLogin, requiereAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM empleados WHERE id = ?", [req.params.id]);
        req.session.mensaje = { texto: "🗑️ Empleado eliminado correctamente", tipo: "borrado" };
        res.redirect('/empleados');
    } catch (error) {
        res.status(500).send("Error al eliminar.");
    }
});

// --- RUTA CERRAR SESIÓN ---
app.get('/logout', (req, res) => {
    req.session.destroy(); 
    res.redirect('/login'); 
});

// ESCUCHA FINAL
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});