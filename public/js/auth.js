async function obtenerPerfil(uid) {
  const snap = await db.collection("usuarios").doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function registrarUsuario({nombre, email, password}) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await db.collection("usuarios").doc(cred.user.uid).set({
    uid: cred.user.uid,
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    rol: "usuario",
    activo: true,
    creado_en: firebase.firestore.FieldValue.serverTimestamp()
  });
  return cred.user;
}

async function iniciarSesion(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  const perfil = await obtenerPerfil(cred.user.uid);
  if (!perfil || perfil.activo === false) {
    await auth.signOut();
    throw new Error("Tu cuenta no está activa.");
  }
  return perfil;
}

function cerrarSesion() {
  return auth.signOut().then(() => location.href = "/login.html");
}

function redirigirPorRol(perfil) {
  if (perfil.rol === "administrador") location.href = "/admin/dashboard.html";
  else if (perfil.rol === "tecnico") location.href = "/tecnico/tareas.html";
  else location.href = "/mis-reportes.html";
}

function protegerPagina(roles = []) {
  auth.onAuthStateChanged(async user => {
    if (!user) {
      location.href = "/login.html";
      return;
    }
    const perfil = await obtenerPerfil(user.uid);
    if (!perfil || perfil.activo === false) {
      await auth.signOut();
      location.href = "/login.html";
      return;
    }
    if (roles.length && !roles.includes(perfil.rol)) {
      redirigirPorRol(perfil);
      return;
    }
    window.usuarioActual = user;
    window.perfilActual = perfil;
    const name = document.querySelector("[data-user-name]");
    if (name) name.textContent = perfil.nombre;
    if (typeof iniciarPagina === "function") iniciarPagina();
  });
}
