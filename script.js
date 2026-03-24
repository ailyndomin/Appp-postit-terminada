document.addEventListener("DOMContentLoaded", async () => {
  try {
    const autostart = window.__TAURI__?.autostart;

    if (autostart?.enable) {
      await autostart.enable();
      console.log("Inicio automático activado");
    } else {
      console.log("Autostart no está disponible en window.__TAURI__");
    }
  } catch (error) {
    console.error("No se pudo activar el inicio automático:", error);
  }

  const $ = (s, r = document) => r.querySelector(s);

  const logoBtn = $(".logo-accion-principal");
  const carpetaBtn = $("#carpeta");
  const panelCarpeta = $("#panel-carpeta");
  const listaCarpeta = $("#lista-carpeta");
  const cerrarCarpetaBtn = $("#cerrar-carpeta");

  if (!logoBtn) return;

  const stripHTML = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const abrirVentanaPostit = async () => {
    try {
      const tauriWebview = window.__TAURI__?.webviewWindow;

      if (!tauriWebview) {
        alert("La API de Tauri no está disponible.");
        return;
      }

      const { WebviewWindow } = tauriWebview;

      const existente = await WebviewWindow.getByLabel("editor_postit");

      if (existente) {
        await existente.setFocus();
        return;
      }

      const win = new WebviewWindow("editor_postit", {
        url: "./postit.html",
        width: 510,
        height: 400,
        resizable: true,
        title: "Post-it",
        transparent: true,
        decorations: true
      });

      win.once("tauri://created", () => {
        console.log("Ventana postit creada");
      });

      win.once("tauri://error", (e) => {
        console.error("Error al crear la ventana:", e);
        alert("No se pudo abrir la ventana del post-it: " + JSON.stringify(e));
      });
    } catch (error) {
      console.error("Error usando WebviewWindow:", error);
      alert("Falló WebviewWindow: " + String(error));
    }
  };

  const abrirVentanaRecordatorio = async (item) => {
    try {
      const tauriWebview = window.__TAURI__?.webviewWindow;

      if (!tauriWebview?.WebviewWindow) {
        console.error("La API de WebviewWindow no está disponible.");
        return;
      }

      await StorageAPI.setPostitEditar(item);

      const label = `recordatorio_${Date.now()}`;

      const win = new tauriWebview.WebviewWindow(label, {
        url: "./postit.html",
        width: 510,
        height: 400,
        resizable: true,
        title: "Recordatorio",
        transparent: true,
        decorations: true
      });

      win.once("tauri://created", () => {
        console.log("Ventana de recordatorio creada");
      });

      win.once("tauri://error", (e) => {
        console.error("Error al crear la ventana de recordatorio:", e);
      });
    } catch (error) {
      console.error("Error abriendo ventana de recordatorio:", error);
    }
  };

  const revisarRecordatorios = async () => {
    try {
      const data = await StorageAPI.getArchivados();
      const ahora = Date.now();
      let huboCambios = false;

      for (const item of data) {
        if (
          item.recordatorioTimestamp &&
          !item.recordatorioDisparado &&
          item.recordatorioTimestamp <= ahora
        ) {
          await abrirVentanaRecordatorio(item);
          item.recordatorioDisparado = true;
          huboCambios = true;
        }
      }

      if (huboCambios) {
        await StorageAPI.setArchivados(data);
        await renderCarpeta();
      }
    } catch (error) {
      console.error("Error revisando recordatorios:", error);
    }
  };

  const renderCarpeta = async () => {
    if (!listaCarpeta) return;

    const data = await StorageAPI.getArchivados();

    listaCarpeta.innerHTML = data.length
      ? data.map((p, i) => `
        <div class="item-carpeta" data-i="${i}">
          <strong>${p.titulo || "Sin título"}</strong><br>
          <small>${stripHTML(p.contenidoHTML || "").slice(0, 160)}</small>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
            <button class="abrir-guardado">Abrir</button>
            <button class="eliminar-guardado">Eliminar</button>
          </div>
        </div>
      `).join("")
      : "<small>No hay post-its guardados.</small>";
  };

  logoBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await abrirVentanaPostit();
  });

  carpetaBtn?.addEventListener("click", async () => {
    panelCarpeta?.classList.toggle("abierta");

    if (panelCarpeta?.classList.contains("abierta")) {
      await renderCarpeta();
    }
  });

  cerrarCarpetaBtn?.addEventListener("click", () => {
    panelCarpeta?.classList.remove("abierta");
  });

  listaCarpeta?.addEventListener("click", async (e) => {
    const card = e.target.closest(".item-carpeta");
    if (!card) return;

    const i = Number(card.dataset.i);
    const data = await StorageAPI.getArchivados();
    const item = data[i];

    if (!item) return;

    if (e.target.closest(".abrir-guardado")) {
      await StorageAPI.setPostitEditar(item);
      await abrirVentanaPostit();

      data.splice(i, 1);
      await StorageAPI.setArchivados(data);
      await renderCarpeta();
      return;
    }

    if (e.target.closest(".eliminar-guardado")) {
      data.splice(i, 1);
      await StorageAPI.setArchivados(data);
      await renderCarpeta();
    }
  });

  window.addEventListener("focus", async () => {
    await renderCarpeta();
    await revisarRecordatorios();
  });

  await renderCarpeta();
  await revisarRecordatorios();

  setInterval(async () => {
    await revisarRecordatorios();
  }, 30000);
});