Proyecto Intranet - Gestión de Empleados
Este es mi primer proyecto completo de desarrollo web, creado para gestionar una base de datos de empleados de forma segura y eficiente.

¿Qué hace esta aplicación?
La aplicación permite administrar el personal de una empresa con las siguientes funciones:

Sistema de Login Seguro: Control de acceso para que solo usuarios registrados entren al panel.

Gestión de Roles: Diferenciación entre administradores (que pueden editar y borrar) y usuarios normales (solo lectura).

Panel CRUD: Capacidad para Crear, Leer, Update (Actualizar) y Delete (Borrar) empleados.

Buscador Inteligente: Filtro por nombre o DNI para encontrar empleados rápidamente.

Mensajes Dinámicos: Alertas visuales que confirman cuando un empleado ha sido añadido o eliminado con éxito.

🛠️ Tecnologías utilizadas
Para este proyecto he utilizado herramientas fundamentales del ecosistema IA y Big Data:

Node.js & Express: El "motor" y el "marco de trabajo" del servidor que maneja las peticiones de los usuarios.

MySQL: El sistema de gestión de bases de datos donde se guarda toda la información.

Bcrypt: Una librería de seguridad para hashear (encriptar) contraseñas, asegurando que nadie pueda verlas en texto plano.

Express-session: Para gestionar las "sesiones", permitiendo que el servidor recuerde quién eres mientras navegas por la web.

💻 Instalación en Local
Si quieres probar este proyecto en tu ordenador:

Clona el repositorio.

Crea la base de datos intranet_db en tu MySQL local.

Instala las dependencias necesarias:

Bash

npm install
Configura tus credenciales en el archivo db.js.

Inicia el servidor:

Bash

node index.js
Entra en tu navegador a: http://localhost:3000
