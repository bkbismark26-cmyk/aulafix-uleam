let unsubscribeNotificaciones = null;


function insertarCampanaNotificaciones() {
  const nav = document.querySelector("header nav");

  if (!nav) {
    return;
  }

  if (document.getElementById("notificacionesLink")) {
    return;
  }

  const enlace = document.createElement("a");

  enlace.href = "/notificaciones.html";
  enlace.id = "notificacionesLink";
  enlace.className = "notificaciones-link";
  enlace.title = "Notificaciones";

  enlace.innerHTML = `
    🔔
    <span
      id="contadorNotificaciones"
      class="contador-notificaciones"
      style="display:none"
    >
      0
    </span>
  `;

  const nombreUsuario =
    nav.querySelector("[data-user-name]");

  if (nombreUsuario) {
    nav.insertBefore(
      enlace,
      nombreUsuario
    );
  } else {
    nav.appendChild(
      enlace
    );
  }
}


function actualizarContadorVisual(cantidad) {
  const contador =
    document.getElementById(
      "contadorNotificaciones"
    );

  if (!contador) {
    return;
  }

  contador.textContent = cantidad;

  contador.style.display =
    cantidad > 0
      ? "inline-flex"
      : "none";
}


function escucharNotificacionesTiempoReal() {
  if (!usuarioActual?.uid) {
    return;
  }

  if (unsubscribeNotificaciones) {
    unsubscribeNotificaciones();
  }

  unsubscribeNotificaciones =
    db
      .collection("notificaciones")
      .where(
        "usuario_id",
        "==",
        usuarioActual.uid
      )
      .onSnapshot(
        snapshot => {

          let noLeidas = 0;

          snapshot.forEach(
            doc => {

              const data =
                doc.data();

              if (
                data.leida === false
              ) {
                noLeidas++;
              }

            }
          );

          actualizarContadorVisual(
            noLeidas
          );
        },

        error => {
          console.error(
            "Error escuchando notificaciones:",
            error
          );

          actualizarContadorVisual(0);
        }
      );
}


async function inicializarNotificacionesUI() {
  insertarCampanaNotificaciones();

  escucharNotificacionesTiempoReal();
}
