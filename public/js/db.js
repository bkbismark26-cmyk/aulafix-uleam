const TRANSICIONES_VALIDAS = {
  pendiente: ["revisado", "rechazado"],
  revisado: ["asignado", "rechazado"],
  asignado: ["en_proceso", "rechazado"],
  en_proceso: ["solucionado"],
  solucionado: ["cerrado", "en_proceso"],
  cerrado: [],
  rechazado: []
};


/* =========================================================
   ESTADOS
========================================================= */

function puedeTransicionar(actual, nuevo) {
  return (
    TRANSICIONES_VALIDAS[actual] || []
  ).includes(nuevo);
}


/* =========================================================
   FECHAS / SLA
========================================================= */

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
  const ahora =
    new Date();

  const anio =
    ahora.getFullYear();

  const timestamp =
    Date.now()
      .toString()
      .slice(-6);

  return `AF-${anio}-${timestamp}`;
}


function calcularFechaVencimiento(prioridad) {
  const horas =
    obtenerHorasSLA(prioridad);

  const fecha =
    new Date();

  fecha.setHours(
    fecha.getHours() + horas
  );

  return firebase.firestore.Timestamp.fromDate(
    fecha
  );
}


/* =========================================================
   NOTIFICACIONES
========================================================= */

async function crearNotificacion({
  usuario_id,
  titulo,
  mensaje,
  tipo = "info",
  reporte_id = null
}) {
  if (!usuario_id) {
    return;
  }

  await db
    .collection("notificaciones")
    .add({
      usuario_id,
      titulo,
      mensaje,
      tipo,
      reporte_id,
      leida: false,

      creado_en:
        firebase.firestore.FieldValue.serverTimestamp()
    });
}


async function listarNotificaciones(uid) {
  const snap =
    await db
      .collection("notificaciones")
      .where(
        "usuario_id",
        "==",
        uid
      )
      .get();

  return snap.docs
    .map(
      doc => ({
        id: doc.id,
        ...doc.data()
      })
    )
    .sort(
      (a, b) =>
        (b.creado_en?.seconds || 0) -
        (a.creado_en?.seconds || 0)
    );
}


async function marcarNotificacionLeida(id) {
  await db
    .collection("notificaciones")
    .doc(id)
    .update({
      leida: true
    });
}


async function contarNotificacionesNoLeidas(uid) {
  const notificaciones =
    await listarNotificaciones(uid);

  return notificaciones
    .filter(
      n => !n.leida
    )
    .length;
}


/* =========================================================
   ADMINISTRADORES
========================================================= */

async function obtenerAdministradores() {
  const snap =
    await db
      .collection("usuarios")
      .where(
        "rol",
        "==",
        "administrador"
      )
      .get();

  return snap.docs
    .map(
      doc => ({
        id: doc.id,
        ...doc.data()
      })
    )
    .filter(
      admin =>
        admin.activo !== false
    );
}


/* =========================================================
   NOTIFICAR ADMINISTRADORES
========================================================= */

async function notificarAdministradores({
  titulo,
  mensaje,
  tipo = "info",
  reporte_id = null
}) {
  const admins =
    await obtenerAdministradores();

  for (
    const admin
    of admins
  ) {
    await crearNotificacion({
      usuario_id: admin.id,
      titulo,
      mensaje,
      tipo,
      reporte_id
    });
  }
}


/* =========================================================
   REPORTES
========================================================= */

async function crearReporte(data) {
  const ticket =
    generarTicket();

  const sla_horas =
    obtenerHorasSLA(
      data.prioridad
    );

  const vence_en =
    calcularFechaVencimiento(
      data.prioridad
    );


  const ref =
    await db
      .collection("reportes")
      .add({
        ...data,

        ticket,
        sla_horas,
        vence_en,

        estado:
          "pendiente",

        tecnico_id:
          null,

        tecnico_nombre:
          null,

        evidencia_final_url:
          null,

        creado_en:
          firebase.firestore.FieldValue.serverTimestamp(),

        actualizado_en:
          firebase.firestore.FieldValue.serverTimestamp(),

        historial: [
          {
            estado:
              "pendiente",

            fecha:
              new Date().toISOString(),

            nota:
              "Reporte creado",

            usuario:
              data.creado_por_nombre
          }
        ],

        comentarios: []
      });


  /* =========================================
     NOTIFICAR ADMINISTRADORES
     NUEVO REPORTE
  ========================================= */

  try {
    await notificarAdministradores({
      titulo:
        "Nuevo reporte registrado",

      mensaje:
        `${data.creado_por_nombre || "Un usuario"} creó el reporte ${ticket}: ${data.titulo}.`,

      tipo:
        "nuevo_reporte",

      reporte_id:
        ref.id
    });

  } catch (error) {
    console.error(
      "El reporte fue creado, pero no se pudo notificar a los administradores:",
      error
    );
  }


  return ref.id;
}


/* =========================================================
   LISTAR MIS REPORTES
========================================================= */

async function listarMisReportes(uid) {
  const snap =
    await db
      .collection("reportes")
      .where(
        "creado_por",
        "==",
        uid
      )
      .get();

  return snap.docs
    .map(
      d => ({
        id: d.id,
        ...d.data()
      })
    )
    .sort(
      (a, b) =>
        (b.creado_en?.seconds || 0) -
        (a.creado_en?.seconds || 0)
    );
}


/* =========================================================
   LISTAR TODOS LOS REPORTES
========================================================= */

async function listarTodosReportes() {
  const snap =
    await db
      .collection("reportes")
      .get();

  return snap.docs
    .map(
      d => ({
        id: d.id,
        ...d.data()
      })
    )
    .sort(
      (a, b) =>
        (b.creado_en?.seconds || 0) -
        (a.creado_en?.seconds || 0)
    );
}


/* =========================================================
   TAREAS DEL TÉCNICO
========================================================= */

async function listarTareasTecnico(uid) {
  const snap =
    await db
      .collection("reportes")
      .where(
        "tecnico_id",
        "==",
        uid
      )
      .get();

  return snap.docs
    .map(
      d => ({
        id: d.id,
        ...d.data()
      })
    )
    .filter(
      r =>
        ![
          "cerrado",
          "rechazado"
        ].includes(
          r.estado
        )
    );
}


/* =========================================================
   OBTENER REPORTE
========================================================= */

async function obtenerReporte(id) {
  const snap =
    await db
      .collection("reportes")
      .doc(id)
      .get();

  return snap.exists
    ? {
        id: snap.id,
        ...snap.data()
      }
    : null;
}


/* =========================================================
   CAMBIAR ESTADO
========================================================= */

async function cambiarEstadoReporte(
  id,
  reporte,
  nuevoEstado,
  nota,
  actorNombre,
  extra = {}
) {
  if (
    !puedeTransicionar(
      reporte.estado,
      nuevoEstado
    )
  ) {
    throw new Error(
      `Transición inválida: ${reporte.estado} → ${nuevoEstado}`
    );
  }


  const historial = [
    ...(reporte.historial || []),

    {
      estado:
        nuevoEstado,

      fecha:
        new Date().toISOString(),

      nota:
        nota || "",

      usuario:
        actorNombre ||
        "Sistema"
    }
  ];


  await db
    .collection("reportes")
    .doc(id)
    .update({
      estado:
        nuevoEstado,

      historial,

      actualizado_en:
        firebase.firestore.FieldValue.serverTimestamp(),

      ...extra
    });


  /* =========================================
     NOTIFICACIONES SEGÚN ESTADO
  ========================================= */


  /* -----------------------------------------
     TÉCNICO COMENZÓ A TRABAJAR
  ----------------------------------------- */

  if (
    nuevoEstado === "en_proceso" &&
    reporte.creado_por
  ) {
    try {
      await crearNotificacion({
        usuario_id:
          reporte.creado_por,

        titulo:
          "Tu reporte está siendo atendido",

        mensaje:
          `El técnico comenzó a trabajar en el reporte ${
            reporte.ticket ||
            reporte.titulo
          }.`,

        tipo:
          "estado",

        reporte_id:
          id
      });

    } catch (error) {
      console.error(
        "No se pudo notificar al usuario:",
        error
      );
    }
  }


  /* -----------------------------------------
     TÉCNICO SOLUCIONÓ
  ----------------------------------------- */

  if (
    nuevoEstado === "solucionado"
  ) {

    if (
      reporte.creado_por
    ) {
      try {
        await crearNotificacion({
          usuario_id:
            reporte.creado_por,

          titulo:
            "Reporte solucionado",

          mensaje:
            `El reporte ${
              reporte.ticket ||
              reporte.titulo
            } fue marcado como solucionado.`,

          tipo:
            "solucion",

          reporte_id:
            id
        });

      } catch (error) {
        console.error(
          "No se pudo notificar al usuario:",
          error
        );
      }
    }


    try {
      await notificarAdministradores({
        titulo:
          "Reporte solucionado",

        mensaje:
          `El técnico marcó como solucionado el reporte ${
            reporte.ticket ||
            reporte.titulo
          }.`,

        tipo:
          "solucion",

        reporte_id:
          id
      });

    } catch (error) {
      console.error(
        "No se pudo notificar a los administradores:",
        error
      );
    }
  }


  /* -----------------------------------------
     ADMINISTRADOR CERRÓ
  ----------------------------------------- */

  if (
    nuevoEstado === "cerrado" &&
    reporte.creado_por
  ) {
    try {
      await crearNotificacion({
        usuario_id:
          reporte.creado_por,

        titulo:
          "Reporte cerrado",

        mensaje:
          `El reporte ${
            reporte.ticket ||
            reporte.titulo
          } fue cerrado correctamente.`,

        tipo:
          "cierre",

        reporte_id:
          id
      });

    } catch (error) {
      console.error(
        "No se pudo notificar al usuario:",
        error
      );
    }
  }


  /* -----------------------------------------
     REPORTE RECHAZADO
  ----------------------------------------- */

  if (
    nuevoEstado === "rechazado" &&
    reporte.creado_por
  ) {
    try {
      await crearNotificacion({
        usuario_id:
          reporte.creado_por,

        titulo:
          "Reporte rechazado",

        mensaje:
          `El reporte ${
            reporte.ticket ||
            reporte.titulo
          } fue rechazado.${

            nota
              ? ` Motivo: ${nota}`
              : ""
          }`,

        tipo:
          "rechazo",

        reporte_id:
          id
      });

    } catch (error) {
      console.error(
        "No se pudo notificar al usuario:",
        error
      );
    }
  }
}


/* =========================================================
   ASIGNAR TÉCNICO
========================================================= */

async function asignarTecnico(
  id,
  reporte,
  tecnico
) {
  if (
    !puedeTransicionar(
      reporte.estado,
      "asignado"
    )
  ) {
    throw new Error(
      `No se puede asignar un técnico desde el estado ${reporte.estado}.`
    );
  }


  const historial = [
    ...(reporte.historial || []),

    {
      estado:
        "asignado",

      fecha:
        new Date().toISOString(),

      nota:
        `Asignado a ${tecnico.nombre}`,

      usuario:
        perfilActual?.nombre ||
        "Administrador"
    }
  ];


  await db
    .collection("reportes")
    .doc(id)
    .update({
      estado:
        "asignado",

      tecnico_id:
        tecnico.id,

      tecnico_nombre:
        tecnico.nombre,

      historial,

      actualizado_en:
        firebase.firestore.FieldValue.serverTimestamp()
    });


  /* -----------------------------------------
     NOTIFICAR AL TÉCNICO
  ----------------------------------------- */

  try {
    await crearNotificacion({
      usuario_id:
        tecnico.id,

      titulo:
        "Nueva incidencia asignada",

      mensaje:
        `Se te asignó el reporte ${
          reporte.ticket ||
          reporte.titulo
        }.`,

      tipo:
        "asignacion",

      reporte_id:
        id
    });

  } catch (error) {
    console.error(
      "No se pudo notificar al técnico:",
      error
    );
  }


  /* -----------------------------------------
     NOTIFICAR AL USUARIO
  ----------------------------------------- */

  if (
    reporte.creado_por
  ) {
    try {
      await crearNotificacion({
        usuario_id:
          reporte.creado_por,

        titulo:
          "Técnico asignado",

        mensaje:
          `${tecnico.nombre} fue asignado al reporte ${
            reporte.ticket ||
            reporte.titulo
          }.`,

        tipo:
          "asignacion",

        reporte_id:
          id
      });

    } catch (error) {
      console.error(
        "No se pudo notificar al usuario:",
        error
      );
    }
  }
}


/* =========================================================
   TÉCNICOS
========================================================= */

async function listarTecnicos() {
  const snap =
    await db
      .collection("usuarios")
      .where(
        "rol",
        "==",
        "tecnico"
      )
      .get();

  return snap.docs
    .map(
      d => ({
        id: d.id,
        ...d.data()
      })
    )
    .filter(
      x =>
        x.activo !== false
    );
}


/* =========================================================
   USUARIOS
========================================================= */

async function listarUsuarios() {
  const snap =
    await db
      .collection("usuarios")
      .get();

  return snap.docs
    .map(
      d => ({
        id: d.id,
        ...d.data()
      })
    );
}


/* =========================================================
   CAMBIAR ROL
========================================================= */

async function cambiarRol(
  uid,
  rol
) {
  if (
    ![
      "usuario",
      "tecnico",
      "administrador"
    ].includes(
      rol
    )
  ) {
    throw new Error(
      "Rol inválido"
    );
  }

  await db
    .collection("usuarios")
    .doc(uid)
    .update({
      rol
    });
}


/* =========================================================
   CAMBIAR ACTIVO
========================================================= */

async function cambiarActivo(
  uid,
  activo
) {
  await db
    .collection("usuarios")
    .doc(uid)
    .update({
      activo
    });
}


/* =========================================================
   COMENTARIOS
========================================================= */

async function agregarComentario(
  id,
  reporte,
  texto,
  actor
) {
  const comentarios = [
    ...(reporte.comentarios || []),

    {
      texto:
        texto.trim(),

      fecha:
        new Date().toISOString(),

      usuario_id:
        actor.uid,

      usuario_nombre:
        actor.nombre,

      rol:
        actor.rol
    }
  ];


  await db
    .collection("reportes")
    .doc(id)
    .update({
      comentarios,

      actualizado_en:
        firebase.firestore.FieldValue.serverTimestamp()
    });
}
