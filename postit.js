document.addEventListener("DOMContentLoaded", async () => {
  const COLORES_DESTACADO = ["transparent","yellow","red", "lightgreen", "cyan", "orange", "pink", "violet"];

  const FONDOS = [
    "fondos/mandala.jpg",
    "fondos/cielo.jpg",
    "fondos/ciudad.jpg",
    "fondos/desierto.jpg",
    "fondos/margaritas.jpg"
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let arrastrando = null;
  let offsetX = 0;
  let offsetY = 0;
  let zActual = 10;

  const traerAlFrente = (postit) => {
    postit.style.zIndex = String(++zActual);
  };

  const postitGuardado = await StorageAPI.getPostitEditar();

  if (postitGuardado) {
    const postit = $(".post-it");

    if (postit) {
      $(".title", postit).value = postitGuardado.titulo || "";
      $(".contenido-postit", postit).innerHTML =
        postitGuardado.contenidoHTML || postitGuardado.texto || "";

      $(".imagenes-fondos", postit).setAttribute(
        "src",
        postitGuardado.imgSrc || "fondos/mandala.jpg"
      );

      if (postitGuardado.recordatorioFecha) {
        postit.dataset.recordatorioFecha = postitGuardado.recordatorioFecha;
        const inputFecha = $(".recordatorio-fecha", postit);
        if (inputFecha) inputFecha.value = postitGuardado.recordatorioFecha;
      }

      if (postitGuardado.recordatorioHora) {
        postit.dataset.recordatorioHora = postitGuardado.recordatorioHora;
        const inputHora = $(".recordatorio-hora", postit);
        if (inputHora) inputHora.value = postitGuardado.recordatorioHora;
      }
    }

    await StorageAPI.clearPostitEditar();
  }

  function guardarRangoSeleccion(postit) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      postit._rangoGuardado = sel.getRangeAt(0).cloneRange();
    }
  }

  function restaurarRangoSeleccion(postit) {
    if (!postit._rangoGuardado) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(postit._rangoGuardado);
  }

  function limpiarSelectoresDe(postit) {
    $(".selector-destacado", postit)?.remove();
  }

  function limpiarTodosLosSelectores() {
    $$(".selector-destacado").forEach(el => el.remove());
  }

  async function guardarEnArchivados(item) {
    const data = await StorageAPI.getArchivados();
    data.unshift(item);
    await StorageAPI.setArchivados(data);
  }

  function crearItemDesdePostit(postit) {
    const recordatorioFecha = postit.dataset.recordatorioFecha || "";
    const recordatorioHora = postit.dataset.recordatorioHora || "";

    let recordatorioTimestamp = null;

    if (recordatorioFecha && recordatorioHora) {
      recordatorioTimestamp = new Date(`${recordatorioFecha}T${recordatorioHora}`).getTime();
    }

    return {
      titulo: $(".title", postit)?.value || "",
      contenidoHTML: $(".contenido-postit", postit)?.innerHTML || "",
      imgSrc: $(".imagenes-fondos", postit)?.getAttribute("src") || FONDOS[0],
      fecha: Date.now(),
      recordatorioFecha,
      recordatorioHora,
      recordatorioTimestamp,
      recordatorioDisparado: false
    };
  }

  async function cerrarVentanaTauri() {
    try {
      const tauriWindow = window.__TAURI__?.window;

      if (tauriWindow?.getCurrent) {
        await tauriWindow.getCurrent().destroy();
        return;
      }
    } catch (e) {
      console.error("No se pudo cerrar con Tauri:", e);
    }

    window.close();
  }

  async function abrirNuevoPostitEnOtraVentana() {
    try {
      const tauriWebview = window.__TAURI__?.webviewWindow;

      if (!tauriWebview?.WebviewWindow) {
        console.error("No está disponible window.__TAURI__.webviewWindow");
        return;
      }

      const label = `editor_postit_${Date.now()}`;

      const win = new tauriWebview.WebviewWindow(label, {
        url: "postit.html",
        width: 510,
        height: 400,
        resizable: true,
        title: "Post-it",
        transparent: true
      });

      win.once("tauri://created", () => {
        console.log("Nueva ventana post-it creada:", label);
      });

      win.once("tauri://error", (e) => {
        console.error("Error al crear nueva ventana post-it:", e);
      });
    } catch (error) {
      console.error("Error abriendo nuevo post-it en otra ventana:", error);
    }
  }

  function activarArrastre(postit) {
    const barra = $(".comandos-superior", postit);
    if (!barra) return;

    barra.addEventListener("mousedown", e => {
      if (e.target.closest("button,input,textarea,label,img")) return;

      arrastrando = postit;
      traerAlFrente(postit);

      const rect = postit.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });
  }

  function mostrarPanelFondos(postit) {
    const panelFondos = $(".panel-fondos", postit);
    if (!panelFondos) return;

    const visible = panelFondos.classList.contains("mostrar");

    $$(".panel-fondos").forEach(panel => {
      panel.classList.remove("mostrar");
      panel.style.display = "none";
    });

    if (!visible) {
      panelFondos.classList.add("mostrar");
      panelFondos.style.display = "flex";
    }
  }

  function mostrarSelectorDestacado(postit, boton, editor) {
    let selector = $(".selector-destacado", postit);

    if (selector) {
      selector.remove();
      return;
    }

    limpiarTodosLosSelectores();
    guardarRangoSeleccion(postit);

    selector = document.createElement("div");
    selector.className = "selector-destacado";
    selector.style.position = "absolute";
    selector.style.zIndex = "9999";

    COLORES_DESTACADO.forEach(color => {
      const cuadrito = document.createElement("div");
      cuadrito.className = "color-destacado";
      cuadrito.style.background = color;

      cuadrito.addEventListener("mousedown", e => e.preventDefault());

      cuadrito.addEventListener("click", () => {
        editor.focus();
        restaurarRangoSeleccion(postit);
        document.execCommand("styleWithCSS", false, true);
        document.execCommand("hiliteColor", false, color);
        selector.remove();
      });

      selector.appendChild(cuadrito);
    });

    postit.appendChild(selector);

    const rectBoton = boton.getBoundingClientRect();
    const rectPostit = postit.getBoundingClientRect();

    const leftDentroPostit = rectBoton.left - rectPostit.left - 40;
    const topDentroPostit = rectBoton.top - rectPostit.top - 55;

    selector.style.left = `${Math.max(10, leftDentroPostit)}px`;
    selector.style.top = `${Math.max(60, topDentroPostit)}px`;
  }

  function inicializarPostit(postit) {
    activarArrastre(postit);

    const btnRecordatorio = $(".recordatorio", postit);
    const panelRecordatorio = $(".panel-recordatorio", postit);
    const inputFechaRecordatorio = $(".recordatorio-fecha", postit);
    const inputHoraRecordatorio = $(".recordatorio-hora", postit);

    const btnAbrirMas = $(".abrir-mas-postit", postit);
    const btnCambioFondo = $(".cambio-fondo", postit);
    const panelFondos = $(".panel-fondos", postit);
    const inputSubirFondo = $(".input-subir-fondo", postit);
    const miniFondos = $$(".mini-fondo", postit);

    const btnCerrar = $(".cerrar-postit", postit);
    const btnDestacar = $(".boton-destacar", postit);
    const btnNegrita = $(".boton-negrita", postit);
    const btnLista = $(".crear-lista", postit);
    const btnTachar = $(".tachar-palabra", postit);
    const editor = $(".contenido-postit", postit);

    postit.addEventListener("mousedown", () => traerAlFrente(postit));

    btnRecordatorio?.addEventListener("click", e => {
      e.stopPropagation();

      if (!panelRecordatorio) return;

      const visible = panelRecordatorio.style.display === "block";

      $$(".panel-recordatorio").forEach(panel => {
        panel.style.display = "none";
      });

      if (!visible) {
        panelRecordatorio.style.display = "block";
      }
    });

    inputFechaRecordatorio?.addEventListener("change", () => {
      postit.dataset.recordatorioFecha = inputFechaRecordatorio.value || "";
    });

    inputHoraRecordatorio?.addEventListener("change", () => {
      postit.dataset.recordatorioHora = inputHoraRecordatorio.value || "";
    });

    btnAbrirMas?.addEventListener("click", async e => {
      e.stopPropagation();
      await abrirNuevoPostitEnOtraVentana();
    });

    btnCambioFondo?.addEventListener("click", e => {
      e.stopPropagation();
      mostrarPanelFondos(postit);
    });

    inputSubirFondo?.addEventListener("change", function () {
      const archivo = this.files?.[0];
      if (!archivo) return;

      const lector = new FileReader();

      lector.onload = e => {
        $(".imagenes-fondos", postit).setAttribute("src", e.target.result);

        if (panelFondos) {
          panelFondos.classList.remove("mostrar");
          panelFondos.style.display = "none";
        }
      };

      lector.readAsDataURL(archivo);
    });

    miniFondos.forEach(img => {
      img.addEventListener("click", () => {
        const fondo = img.dataset.fondo;
        if (!fondo) return;

        $(".imagenes-fondos", postit).setAttribute("src", fondo);

        if (panelFondos) {
          panelFondos.classList.remove("mostrar");
          panelFondos.style.display = "none";
        }
      });
    });

    btnCerrar?.addEventListener("click", async e => {
      e.stopPropagation();

      const item = crearItemDesdePostit(postit);
      await guardarEnArchivados(item);

      limpiarSelectoresDe(postit);
      postit.remove();

      await cerrarVentanaTauri();
    });

    btnNegrita?.addEventListener("click", e => {
      e.stopPropagation();
      editor.focus();
      document.execCommand("bold");
    });

    editor?.addEventListener("mouseup", () => guardarRangoSeleccion(postit));
    editor?.addEventListener("keyup", () => guardarRangoSeleccion(postit));

    btnDestacar?.addEventListener("click", e => {
      e.stopPropagation();
      mostrarSelectorDestacado(postit, e.currentTarget, editor);
    });

    btnLista?.addEventListener("click", e => {
      e.stopPropagation();
      editor.focus();
      document.execCommand("insertUnorderedList");
    });

    btnTachar?.addEventListener("click", e => {
      e.stopPropagation();
      editor.focus();
      document.execCommand("strikeThrough");
    });
  }

  $$(".post-it").forEach((postit, index) => {
    if (index === 0) {
      postit.style.position = "absolute";
      postit.style.left = "20px";
      postit.style.top = "20px";
    }

    inicializarPostit(postit);
    traerAlFrente(postit);
  });

  document.addEventListener("mouseup", () => {
    arrastrando = null;
  });

  document.addEventListener("mousemove", e => {
    if (!arrastrando) return;

    let nuevaIzquierda = e.clientX - offsetX;
    let nuevaArriba = e.clientY - offsetY;

    arrastrando.style.left = `${nuevaIzquierda}px`;
    arrastrando.style.top = `${nuevaArriba}px`;
  });

  document.addEventListener("click", e => {
    const dentroDeSelector = e.target.closest(".selector-destacado,.panel-recordatorio,.panel-fondos");
    const botonFondo = e.target.closest(".cambio-fondo");
    const botonDestacar = e.target.closest(".boton-destacar");
    const botonRecordatorio = e.target.closest(".recordatorio");

    if (!dentroDeSelector && !botonFondo && !botonDestacar && !botonRecordatorio) {
      limpiarTodosLosSelectores();

      $$(".panel-recordatorio").forEach(panel => {
        panel.style.display = "none";
      });

      $$(".panel-fondos").forEach(panel => {
        panel.classList.remove("mostrar");
        panel.style.display = "none";
      });
    }
  });

  document.addEventListener("mouseover", e => {
    const boton = e.target.closest("button");
    if (!boton) return;

    boton.style.backgroundColor = "rgba(11, 233, 241, 0.99)";
  });

  document.addEventListener("mouseout", e => {
    const boton = e.target.closest("button");
    if (!boton) return;

    if (!boton.contains(e.relatedTarget)) {
      boton.style.backgroundColor = "";
    }
  });
});