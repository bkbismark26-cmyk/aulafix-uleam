# AulaFix ULEAM
Sistema web para reportar, asignar, atender y cerrar incidencias de mantenimiento en aulas, laboratorios y espacios universitarios.

## Flujo principal
Usuario -> crea reporte -> Administrador revisa -> asigna técnico -> Técnico atiende -> adjunta evidencia -> Administrador/usuario cierra.

## Roles
- usuario: crea reportes, consulta estados y agrega comentarios.
- tecnico: ve tareas asignadas, inicia trabajo y marca solución.
- administrador: revisa reportes, cambia prioridad, asigna técnico, consulta métricas y gestiona roles.

## Estados
pendiente -> revisado -> asignado -> en_proceso -> solucionado -> cerrado
pendiente/revisado -> rechazado

## Tecnología
HTML5 + CSS3 + JavaScript + Firebase Authentication + Firestore + Firebase Hosting.
Para imágenes se incluye integración opcional con Cloudinary para evitar depender de Firebase Storage.

## 1. Instalar herramientas
1. Node.js LTS
2. Visual Studio Code
3. Git
4. Cuenta de GitHub
5. Cuenta de Firebase
6. Cuenta de Cloudinary (solo si usarás fotos)

Verifica:
```bash
node --version
npm --version
git --version
```

Instala Firebase CLI:
```bash
npm install -g firebase-tools
firebase --version
firebase login
```

## 2. Crear Firebase
1. Firebase Console -> Crear proyecto.
2. Authentication -> Sign-in method -> Correo/contraseña -> Activar.
3. Firestore Database -> Crear base de datos -> Modo producción.
4. Configuración del proyecto -> Tus apps -> Web -> Registrar app.
5. Copia la configuración y pégala en `public/js/firebase-config.js`.

## 3. Configurar .firebaserc
Reemplaza `TU-PROYECTO-ID` por el Project ID real.

## 4. Publicar reglas
Desde la raíz:
```bash
firebase deploy --only "firestore:rules"
```

## 5. Crear primer usuario
1. Ejecuta localmente el sistema.
2. Registra una cuenta.
3. En Firestore -> colección `usuarios` -> documento del usuario -> cambia `rol` de `usuario` a `administrador`.
4. Cierra sesión y vuelve a entrar.

## 6. Crear técnicos
Los técnicos se registran igual que cualquier usuario. Luego el administrador cambia su rol a `tecnico` desde el panel Usuarios.

## 7. Ejecutar localmente
```bash
firebase serve --only hosting
```
Luego abre http://localhost:5000

## 8. Publicar
```bash
firebase deploy
```

## 9. GitHub recomendado
```bash
git init
git add .
git commit -m "estructura inicial AulaFix"
git branch -M main
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

Haz commits por etapas para demostrar trabajo real:
- estructura inicial
- autenticación
- creación de reportes
- panel administrador
- panel técnico
- reglas de seguridad
- mejoras visuales y pruebas

## Cloudinary opcional
1. Crea cuenta en Cloudinary.
2. Crea un Unsigned Upload Preset.
3. Edita `public/js/cloudinary-config.js`.
4. Coloca tu `cloudName` y `uploadPreset`.
5. Si no configuras Cloudinary, el sistema sigue funcionando pero sin subida de fotos.

## Colecciones de Firestore
### usuarios
- uid
- nombre
- email
- rol: usuario | tecnico | administrador
- activo
- creado_en

### reportes
- titulo
- descripcion
- categoria
- prioridad
- estado
- ubicacion {facultad,bloque,piso,aula}
- imagen_inicial_url
- evidencia_final_url
- creado_por
- creado_por_nombre
- tecnico_id
- tecnico_nombre
- creado_en
- actualizado_en
- historial[]
- comentarios[]

## Defensa
Debes poder explicar:
- por qué elegiste el problema,
- roles,
- estructura de datos,
- máquina de estados,
- seguridad,
- flujo completo,
- decisiones del código,
- pruebas realizadas y errores solucionados.

No entregues el proyecto sin cambiar textos, agregar datos reales de prueba, tomar tus propias capturas y entender el código.
