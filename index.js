// 1. Importaciones
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require("./db"); // Conexión a la DB

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const port = 3000;

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
        res.send(`¡Éxito! El empleado ${nombre} ha sido registrado.`);
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

        res.send(`✅ Bienvenido de nuevo, ${usuarioEncontrado.nombre}.`);
    } catch (error) {
        res.status(500).send("Error en el inicio de sesión.");
    }
});

// --- 4. RUTA DE LISTADO (GET) ---
app.get('/empleados', async (req, res) => {
    try {
        const [filas] = await db.query("SELECT * FROM empleados"); //

        let html = `
            <html>
            <head>
                <title>Panel de Empleados</title>
                <style>
                    body { font-family: Arial; padding: 20px; background-color: #f4f4f4; }
                    table { width: 100%; border-collapse: collapse; background: white; margin-top: 20px;}
                    th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                    th { background-color: #2c3e50; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                    .btn-borrar { background-color: #e74c3c; color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; }
                    .btn-edit { background-color: #3498db; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; margin-right: 5px; }
                </style>
            </head>
            <body>
                <h1>📋 Plantilla de la Intranet</h1>
                <table>
                    <tr>
                        <th>ID</th><th>Nombre</th><th>Email</th><th>DNI</th><th>Acciones</th>
                    </tr>
        `;

        filas.forEach(empleado => {
           html += `
                <tr>
                    <td>${empleado.id}</td>
                    <td>${empleado.nombre}</td>
                    <td>${empleado.correo}</td>
                    <td>${empleado.dni}</td>
                    <td>
                        <a href="/editar/${empleado.id}" class="btn-edit">Editar</a>
                        <form action="/eliminar/${empleado.id}" method="POST" style="display:inline;">
                            <button type="submit" class="btn-borrar" onclick="return confirm('¿Seguro?')">Eliminar</button>
                        </form>
                    </td>
                 </tr>
            `;
        });

        html += `</table><br><a href="/login.html">Volver al Login</a></body></html>`;
        res.send(html);
    } catch (error) {
        res.status(500).send("Error al cargar la lista.");
    }
});

// --- 5. RUTA EDITAR (FORMULARIO) ---
app.get('/editar/:id', async (req, res) => {
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

// --- 6. RUTA ACTUALIZAR (PROCESO) ---
app.post('/actualizar/:id', async (req, res) => {
    const id = req.params.id;
    const { nombre, correo, movil, dni } = req.body;

    // Aplicamos los mismos "Porteros" por seguridad
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

// --- 7. RUTA ELIMINAR ---
app.post('/eliminar/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM empleados WHERE id = ?", [req.params.id]);
        res.redirect('/empleados');
    } catch (error) {
        res.status(500).send("Error al eliminar.");
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});