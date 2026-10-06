const TRANSICIONES_VALIDAS = {
  pendiente: ["revisado", "rechazado"],
  revisado: ["asignado", "rechazado"],
  asignado: ["en_proceso", "rechazado"],
  en_proceso: ["solucionado"],
  solucionado: ["cerrado", "en_proceso"],
  cerrado: [],
  rechazado: []
};

function puedeTransicionar(actual, nuevo) {
  return (TRANSICIONES_VALIDAS[actual] || []).includes(nuevo);
}

function timestampAhora() {
  return firebase.firestore.Timestamp.now();
}

function obtenerHorasSLA(prioridad) {
  const sla = {
    urgente: 2,
    alta: 6,
    media: 24,
    baja: 72
  };

  return sla[prioridad] || 24;
}

function generarTicket() {
  const ahora = new Date();

  const anio = ahora.getFullYear();
  const timestamp = Date.now().toString().slice(-6);

  return `AF-${anio}-${timestamp}`;
}

function calcularFechaVencimiento(prioridad) {
  const horas = obtenerHorasSLA(prioridad);

  const fecha = new Date();

  fecha.setHours(fecha.getHours() + horas);

  return firebase.firestore.Timestamp.fromDate(fecha);
}

async function crearReporte(data) {

  const ticket = generarTicket();

  const sla_horas = obtenerHorasSLA(data.prioridad);

  const vence_en = calcularFechaVencimiento(data.prioridad);

  const ref = await db.collection("reportes").add({

    ...data,

    ticket: ticket,

    sla_horas: sla_horas,

    vence_en: vence_en,

    estado: "pendiente",

    tecnico_id: null,

    tecnico_nombre: null,

    evidencia_final_url: null,

    creado_en:
      firebase.firestore.FieldValue.serverTimestamp(),

    actualizado_en:
      firebase.firestore.FieldValue.serverTimestamp(),

    historial: [
      {
        estado: "pendiente",
        fecha: new Date().toISOString(),
        nota: "Reporte creado",
        usuario: data.creado_por_nombre
      }
    ],

    comentarios: []
  });

  return ref.id;
}

async function listarMisReportes(uid) {
  const snap = await db.collection("reportes").where("creado_por", "==", uid).get();
  return snap.docs.map(d => ({id:d.id, ...d.data()}))
    .sort((a,b) => (b.creado_en?.seconds||0)-(a.creado_en?.seconds||0));
}

async function listarTodosReportes() {
  const snap = await db.collection("reportes").get();
  return snap.docs.map(d => ({id:d.id, ...d.data()}))
    .sort((a,b) => (b.creado_en?.seconds||0)-(a.creado_en?.seconds||0));
}

async function listarTareasTecnico(uid) {
  const snap = await db.collection("reportes").where("tecnico_id","==",uid).get();
  return snap.docs.map(d => ({id:d.id, ...d.data()}))
    .filter(r => !["cerrado","rechazado"].includes(r.estado));
}

async function obtenerReporte(id) {
  const snap = await db.collection("reportes").doc(id).get();
  return snap.exists ? {id:snap.id, ...snap.data()} : null;
}

async function cambiarEstadoReporte(id, reporte, nuevoEstado, nota, actorNombre, extra={}) {
  if (!puedeTransicionar(reporte.estado, nuevoEstado)) {
    throw new Error(`Transición inválida: ${reporte.estado} → ${nuevoEstado}`);
  }
  const historial = [...(reporte.historial || []), {
    estado: nuevoEstado,
    fecha: new Date().toISOString(),
    nota: nota || "",
    usuario: actorNombre || "Sistema"
  }];

  await db.collection("reportes").doc(id).update({
    estado: nuevoEstado,
    historial,
    actualizado_en: firebase.firestore.FieldValue.serverTimestamp(),
    ...extra
  });
}

async function asignarTecnico(id, reporte, tecnico) {
  const historial = [...(reporte.historial || []), {
    estado: "asignado",
    fecha: new Date().toISOString(),
    nota: `Asignado a ${tecnico.nombre}`,
    usuario: perfilActual.nombre
  }];
  await db.collection("reportes").doc(id).update({
    estado: "asignado",
    tecnico_id: tecnico.id,
    tecnico_nombre: tecnico.nombre,
    historial,
    actualizado_en: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function listarTecnicos() {
  const snap = await db.collection("usuarios").where("rol","==","tecnico").get();
  return snap.docs.map(d => ({id:d.id,...d.data()})).filter(x => x.activo !== false);
}

async function listarUsuarios() {
  const snap = await db.collection("usuarios").get();
  return snap.docs.map(d => ({id:d.id,...d.data()}));
}

async function cambiarRol(uid, rol) {
  if (!["usuario","tecnico","administrador"].includes(rol)) throw new Error("Rol inválido");
  await db.collection("usuarios").doc(uid).update({rol});
}

async function cambiarActivo(uid, activo) {
  await db.collection("usuarios").doc(uid).update({activo});
}

async function agregarComentario(id, reporte, texto, actor) {
  const comentarios = [...(reporte.comentarios || []), {
    texto: texto.trim(),
    fecha: new Date().toISOString(),
    usuario_id: actor.uid,
    usuario_nombre: actor.nombre,
    rol: actor.rol
  }];
  await db.collection("reportes").doc(id).update({
    comentarios,
    actualizado_en: firebase.firestore.FieldValue.serverTimestamp()
  });
}
