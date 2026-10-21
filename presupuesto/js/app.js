/* =============================================================
   Calculadora de presupuestos — interfaz y estado
   -------------------------------------------------------------
   - Estado SOLO en memoria: sin localStorage ni sessionStorage.
   - Los datos salen del navegador únicamente cuando el usuario
     pulsa una acción de contacto (copiar / WhatsApp / email).
   - Nunca confirma un envío que no ocurrió.
   ============================================================= */

var CALC = CALC || {};

(function () {
  "use strict";

  var cfg, preguntas;
  var estado = nuevoEstado();
  var primerRender = true;

  var els = {};

  function nuevoEstado() {
    return { paso: 0, respuestas: {}, vista: "paso" };
  }

  /* ---------------- utilidades ---------------- */

  function esc(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function opcionesDe(q, r) {
    var ops = typeof q.opciones === "function" ? q.opciones(r) : q.opciones;
    if (ops) return ops;
    if (q.desdeConfig) {
      var lista = cfg[q.desdeConfig] || [];
      return lista.map(function (item) {
        return {
          valor: item.id,
          etiqueta: item.nombre,
          desc: item.descripcion || "",
          nota: item.nota || ""
        };
      });
    }
    return [];
  }

  function tituloDe(q, r) {
    return typeof q.titulo === "function" ? q.titulo(r) : q.titulo;
  }

  function subDe(q, r) {
    return typeof q.sub === "function" ? q.sub(r) : q.sub;
  }

  function preguntaPorId(id) {
    for (var i = 0; i < preguntas.length; i++) {
      if (preguntas[i].id === id) return preguntas[i];
    }
    return null;
  }

  /* Preguntas visibles según respuestas (condicionales). */
  function activas() {
    return preguntas.filter(function (q) {
      return !q.cuando || q.cuando(estado.respuestas);
    });
  }

  function etiquetaUnica(id, valor) {
    var q = preguntaPorId(id);
    if (!q) return valor;
    var ops = opcionesDe(q, estado.respuestas);
    for (var i = 0; i < ops.length; i++) {
      if (ops[i].valor === valor) return ops[i].etiqueta;
    }
    return valor;
  }

  function etiquetaFuncionalidades() {
    var sel = estado.respuestas.funcionalidades || [];
    if (!sel.length) return "Ninguna";
    var nombres = [];
    sel.forEach(function (id) {
      var f = CALC.engine.buscarPorId(cfg.funcionalidades, id);
      if (f) nombres.push(f.nombre);
    });
    return nombres.length ? nombres.join(", ") : "Ninguna";
  }

  function etiquetaCantidad() {
    var v = estado.respuestas.cantidad;
    if (!v) return "";
    if (v === "varias") {
      var n = estado.respuestas.paginas_numero;
      return n ? String(n) + (Number(n) === 1 ? " página" : " páginas") : "De 5 páginas en adelante";
    }
    return etiquetaUnica("cantidad", v);
  }

  function etiquetaRedaccion() {
    if (estado.respuestas.redaccion !== "si") return "No, el contenido lo aporta el cliente";
    if (estado.respuestas.tipo_proyecto === "landing") return "Sí, landing completa";
    var n = estado.respuestas.redaccion_paginas;
    return n ? "Sí, " + String(n) + (Number(n) === 1 ? " página" : " páginas") : "Sí";
  }

  function etiquetaPresupuestoDisponible() {
    if (estado.respuestas.rango_inversion) {
      return etiquetaUnica("rango_inversion", estado.respuestas.rango_inversion);
    }
    var c = estado.respuestas.contacto || {};
    return c.presupuesto_disponible ? c.presupuesto_disponible : "No especificado";
  }

  function hayEmailjs() {
    var e = cfg.contacto.emailjs;
    return !!(e.publicKey && e.serviceId && e.templateId);
  }

  /* ---------------- progreso ---------------- */

  function renderProgreso() {
    if (estado.vista === "resultado") {
      els.progresoRelleno.style.width = "100%";
      els.progresoBar.setAttribute("aria-valuemax", "1");
      els.progresoBar.setAttribute("aria-valuenow", "1");
      els.progresoTexto.textContent = "Resumen del presupuesto";
      return;
    }
    var total = activas().length;
    var actual = Math.min(estado.paso + 1, total);
    els.progresoBar.setAttribute("aria-valuemax", String(total));
    els.progresoBar.setAttribute("aria-valuenow", String(actual));
    els.progresoRelleno.style.width = Math.round((actual / total) * 100) + "%";
    els.progresoTexto.textContent = "Pregunta " + actual + " de " + total;
  }

  /* ---------------- render de pasos ---------------- */

  function opcionesHTML(q, r) {
    var ops = opcionesDe(q, r);
    var multi = q.tipo === "multi";
    var elegidas = multi ? (estado.respuestas[q.id] || []) : estado.respuestas[q.id];
    var html = "";

    ops.forEach(function (op) {
      var marcada = multi
        ? elegidas.indexOf(op.valor) !== -1
        : elegidas === op.valor;
      html +=
        '<label class="calc-opcion' + (op.destacada ? " calc-opcion--destacada" : "") + '">' +
          '<input class="calc-opcion-input" type="' + (multi ? "checkbox" : "radio") + '"' +
            ' name="' + esc(q.id) + '" value="' + esc(op.valor) + '"' + (marcada ? " checked" : "") + ">" +
          '<span class="calc-opcion-cuerpo">' +
            '<span class="calc-opcion-titulo">' + esc(op.etiqueta) + "</span>" +
            (op.desc ? '<span class="calc-opcion-desc">' + esc(op.desc) + "</span>" : "") +
            (op.nota ? '<span class="calc-opcion-nota">' + esc(op.nota) + "</span>" : "") +
          "</span>" +
          '<span class="calc-opcion-marca" aria-hidden="true"></span>' +
        "</label>";
    });

    return html;
  }

  function extraHTML(q) {
    /* Pregunta de cantidad con campo numérico (institucional, 5+). */
    if (q.id === "cantidad" && q.inputNumero) {
      var valor = estado.respuestas.paginas_numero || "";
      return (
        '<div class="calc-extra" data-extra="numero" hidden>' +
          '<label class="calc-campo-etiqueta" for="calc-numero">' + esc(q.inputNumero.etiqueta) + "</label>" +
          '<input class="calc-campo" id="calc-numero" type="number" inputmode="numeric" min="' +
            esc(q.inputNumero.min) + '" step="1" placeholder="' + esc(q.inputNumero.placeholder) +
            '" value="' + esc(valor) + '">' +
          '<p class="calc-campo-ayuda">Hasta ' + esc(String(CALC.config.proyectos.institucional.paginasIncluidas)) +
            ' páginas están incluidas en el precio base.</p>' +
        "</div>"
      );
    }
    /* Campo numérico condicional de la pregunta de redacción. */
  if (q.id === "redaccion" && q.inputNumero) {
    var cfgR = q.inputNumero;
    var marcado = estado.respuestas[q.id];
    var activo = marcado === cfgR.paraValor;
    var valR = estado.respuestas.redaccion_paginas || "";
    var tope = CALC.topePaginas(estado.respuestas);
    return (
      '<div class="calc-extra" data-extra="redaccion"' + (activo ? "" : " hidden") + ">" +
        '<label class="calc-campo-etiqueta" for="calc-redaccion-paginas">' + esc(cfgR.etiqueta) + "</label>" +
        '<input class="calc-campo" id="calc-redaccion-paginas" type="number" inputmode="numeric" min="' +
          esc(cfgR.min) + '"' + (tope > 0 ? ' max="' + esc(tope) + '"' : "") +
          ' step="1" placeholder="' + esc(cfgR.placeholder) + '" value="' + esc(valR) + '">' +
        (cfgR.ayuda ? '<p class="calc-campo-ayuda">' + esc(typeof cfgR.ayuda === "function" ? cfgR.ayuda(estado.respuestas) : cfgR.ayuda) + "</p>" : "") +
      "</div>"
    );
  }
  /* Texto condicional de integraciones externas. */
    if (q.tipo === "multi" && q.textoSiSeleccion) {
      var t = q.textoSiSeleccion;
      var sel = estado.respuestas[q.id] || [];
      var activo = sel.indexOf(t.paraId) !== -1;
      var val = estado.respuestas.integraciones_descripcion || "";
      return (
        '<div class="calc-extra" data-extra="texto" data-para="' + esc(t.paraId) + '"' + (activo ? "" : " hidden") + '>' +
          '<label class="calc-campo-etiqueta" for="calc-texto-extra">' + esc(t.etiqueta) + "</label>" +
          '<textarea class="calc-campo" id="calc-texto-extra" rows="3" placeholder="' + esc(t.placeholder) +
            '" aria-describedby="calc-texto-error">' + esc(val) + "</textarea>" +
          '<p class="calc-campo-error" id="calc-texto-error" role="alert"></p>' +
        "</div>"
      );
    }
    return "";
  }

  function camposContactoHTML(q) {
    var c = estado.respuestas.contacto || {};
    var html = '<div class="calc-campos">';
    (q.campos || []).forEach(function (campo) {
      if (campo.ocultoSiRangos && cfg.rangosInversion.length) return;
      var v = c[campo.id] || "";
      var id = "campo-" + campo.id;
      var common =
        ' id="' + esc(id) + '" name="' + esc(campo.id) + '"' +
        ' class="calc-campo"' +
        (campo.autocomplete ? ' autocomplete="' + esc(campo.autocomplete) + '"' : "") +
        (campo.placeholder ? ' placeholder="' + esc(campo.placeholder) + '"' : "") +
        ' aria-describedby="error-' + esc(campo.id) + '"';
      html +=
        '<div class="calc-campo-bloque">' +
          '<label class="calc-campo-etiqueta" for="' + esc(id) + '">' +
            esc(campo.etiqueta) +
            (campo.requerido ? ' <span class="calc-obligatorio" aria-hidden="true">*</span>' : ' <span class="calc-opcional">(opcional)</span>') +
          "</label>";
      if (campo.tipo === "textarea") {
        html += "<textarea" + common + ' rows="5">' + esc(v) + "</textarea>";
      } else {
        html += '<input' + common + ' type="' + esc(campo.tipo) + '" value="' + esc(v) + '">';
      }
      html += '<p class="calc-campo-error" id="error-' + esc(campo.id) + '" role="alert"></p></div>';
    });
    html += "</div>";
    return html;
  }

  function renderPaso(conFoco) {
    estado.vista = "paso";
    var lista = activas();
    if (estado.paso > lista.length - 1) estado.paso = lista.length - 1;
    if (estado.paso < 0) estado.paso = 0;

    var q = lista[estado.paso];
    var r = estado.respuestas;
    var titulo = tituloDe(q, r);
    var sub = subDe(q, r);

    var cuerpo = "";
    if (q.tipo === "formulario") {
      cuerpo = camposContactoHTML(q);
    } else {
      cuerpo =
        '<fieldset class="calc-fieldset">' +
          '<legend class="sr-only">' + esc(titulo) + "</legend>" +
          '<div class="calc-opciones' + (q.tipo === "multi" ? " calc-opciones--multi" : "") + '">' +
            opcionesHTML(q, r) +
          "</div>" +
        "</fieldset>" +
        extraHTML(q) +
        (q.tipo === "multi" && q.ayudaMulti ? '<p class="calc-ayuda">' + esc(q.ayudaMulti) + "</p>" : "");
    }

    var esPrimero = estado.paso === 0;
    var html =
      '<section class="calc-paso" tabindex="-1" aria-labelledby="paso-titulo">' +
        '<h2 class="calc-paso-titulo" id="paso-titulo">' + esc(titulo) + "</h2>" +
        (sub ? '<p class="calc-paso-sub">' + esc(sub) + "</p>" : "") +
        cuerpo +
        '<p class="calc-error" role="alert" hidden></p>' +
        '<div class="calc-acciones-paso">' +
          (esPrimero ? "" : '<button type="button" class="calc-btn calc-btn--secundario" data-accion="atras">Atrás</button>') +
          '<button type="button" class="calc-btn calc-btn--primario" data-accion="siguiente">' +
            (q.tipo === "formulario" ? "Ver presupuesto" : "Continuar") +
          "</button>" +
        "</div>" +
      "</section>";

    els.pasoContenedor.innerHTML = html;
    renderProgreso();

    if (conFoco && !primerRender) {
      var paso = els.pasoContenedor.querySelector(".calc-paso");
      if (paso) paso.focus();
    }
    primerRender = false;
  }

  /* ---------------- validación y navegación ---------------- */

  function mostrarError(texto, foco) {
    var error = els.pasoContenedor.querySelector(".calc-error");
    if (error) {
      error.textContent = texto;
      error.hidden = false;
    }
    if (foco) foco.focus();
  }

  function limpiarError() {
    var error = els.pasoContenedor.querySelector(".calc-error");
    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
    els.pasoContenedor.querySelectorAll(".calc-campo-error").forEach(function (e) {
      e.textContent = "";
    });
    els.pasoContenedor.querySelectorAll("[aria-invalid]").forEach(function (e) {
      e.removeAttribute("aria-invalid");
    });
  }

  /* Guarda lo que esté visible sin validar (al avanzar o retroceder). */
  function guardarSinValidar() {
    var q = activas()[estado.paso];
    if (!q) return;
    if (q.tipo === "unica") {
      var marcado = els.pasoContenedor.querySelector('input[name="' + q.id + '"]:checked');
      if (marcado) estado.respuestas[q.id] = marcado.value;
      if (q.id === "cantidad") {
        var num = els.pasoContenedor.querySelector("#calc-numero");
        if (num && num.value !== "") estado.respuestas.paginas_numero = num.value;
      }
      if (q.id === "redaccion" && q.inputNumero) {
        var numR = els.pasoContenedor.querySelector("#calc-redaccion-paginas");
        if (numR && numR.value !== "") estado.respuestas.redaccion_paginas = numR.value;
      }
    } else if (q.tipo === "multi") {
      var vals = [];
      els.pasoContenedor.querySelectorAll('input[name="' + q.id + '"]:checked').forEach(function (i) {
        vals.push(i.value);
      });
      estado.respuestas[q.id] = vals;
      if (q.textoSiSeleccion) {
        var ta = els.pasoContenedor.querySelector("#calc-texto-extra");
        if (ta) estado.respuestas.integraciones_descripcion = ta.value;
      }
    } else if (q.tipo === "formulario") {
      var c = estado.respuestas.contacto || {};
      (q.campos || []).forEach(function (campo) {
        var input = els.pasoContenedor.querySelector('[name="' + campo.id + '"]');
        if (input) c[campo.id] = input.value;
      });
      estado.respuestas.contacto = c;
    }
  }

  function validarPaso() {
    var q = activas()[estado.paso];
    limpiarError();

    if (q.tipo === "unica") {
      var marcado = els.pasoContenedor.querySelector('input[name="' + q.id + '"]:checked');
      if (!marcado) {
        mostrarError("Seleccioná una opción para continuar.", els.pasoContenedor.querySelector(".calc-opcion-input"));
        return false;
      }
      estado.respuestas[q.id] = marcado.value;
      if (q.id === "tipo_proyecto") {
        /* Las opciones de cantidad cambian con el tipo de proyecto. */
        delete estado.respuestas.cantidad;
        delete estado.respuestas.paginas_numero;
      }
      if (q.id === "cantidad") {
        if (marcado.value === "varias") {
          var num = els.pasoContenedor.querySelector("#calc-numero");
          var n = parseInt(num.value, 10);
          if (isNaN(n) || n < q.inputNumero.min) {
            mostrarError("Ingresá la cantidad de páginas (" + q.inputNumero.min + " o más).", num);
            num.setAttribute("aria-invalid", "true");
            return false;
          }
          estado.respuestas.paginas_numero = String(n);
        } else {
          delete estado.respuestas.paginas_numero;
        }
      }
      if (q.id === "redaccion" && q.inputNumero) {
        var cfgR = q.inputNumero;
        if (marcado.value === cfgR.paraValor) {
          var numR = els.pasoContenedor.querySelector("#calc-redaccion-paginas");
          var cantR = parseInt(numR.value, 10);
          var tope = CALC.topePaginas(estado.respuestas);
          if (isNaN(cantR) || cantR < cfgR.min) {
            mostrarError("Indicá cuántas páginas necesitan redacción (" + cfgR.min + " o más).", numR);
            numR.setAttribute("aria-invalid", "true");
            return false;
          }
          if (tope > 0 && cantR > tope) {
            mostrarError(
              "El proyecto contempla " + tope + (tope === 1 ? " página" : " páginas") +
              ". Si necesitás redacción para más, primero ampliá el alcance del sitio.", numR
            );
            numR.setAttribute("aria-invalid", "true");
            return false;
          }
          estado.respuestas.redaccion_paginas = String(cantR);
        } else {
          delete estado.respuestas.redaccion_paginas;
        }
      }
      return true;
    }

    if (q.tipo === "multi") {
      var vals = [];
      els.pasoContenedor.querySelectorAll('input[name="' + q.id + '"]:checked').forEach(function (i) {
        vals.push(i.value);
      });
      estado.respuestas[q.id] = vals;
      if (q.textoSiSeleccion) {
        var t = q.textoSiSeleccion;
        var ta = els.pasoContenedor.querySelector("#calc-texto-extra");
        var visibles = ta && ta.closest("[data-extra]").hasAttribute("hidden") === false;
        if (vals.indexOf(t.paraId) !== -1 && visibles) {
          if (!ta.value.trim()) {
            var err = els.pasoContenedor.querySelector("#calc-texto-error");
            err.textContent = t.error;
            ta.setAttribute("aria-invalid", "true");
            ta.focus();
            return false;
          }
          estado.respuestas.integraciones_descripcion = ta.value.trim();
        }
      }
      return true;
    }

    if (q.tipo === "formulario") {
      var contacto = {};
      var primerInvalido = null;
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      (q.campos || []).forEach(function (campo) {
        if (campo.ocultoSiRangos && cfg.rangosInversion.length) return;
        var input = els.pasoContenedor.querySelector('[name="' + campo.id + '"]');
        if (!input) return;
        var valor = input.value.trim();
        var errorEl = document.getElementById("error-" + campo.id);
        var mensaje = "";
        if (campo.requerido && !valor) {
          mensaje = "Completá " + campo.etiqueta.toLowerCase() + ".";
        } else if (campo.tipo === "email" && valor && !emailRegex.test(valor)) {
          mensaje = "Ingresá un email válido, por ejemplo nombre@dominio.com.";
        }
        if (mensaje) {
          errorEl.textContent = mensaje;
          input.setAttribute("aria-invalid", "true");
          if (!primerInvalido) primerInvalido = input;
        } else {
          errorEl.textContent = "";
          input.removeAttribute("aria-invalid");
        }
        contacto[campo.id] = valor;
      });
      estado.respuestas.contacto = contacto;
      if (primerInvalido) {
        primerInvalido.focus();
        return false;
      }
      return true;
    }

    return true;
  }

  function siguiente() {
    guardarSinValidar();
    if (!validarPaso()) return;
    var lista = activas();
    if (estado.paso >= lista.length - 1) {
      estado.vista = "resultado";
      renderResultado(true);
    } else {
      estado.paso++;
      renderPaso(true);
    }
  }

  function atras() {
    guardarSinValidar();
    if (estado.paso > 0) {
      estado.paso--;
      renderPaso(true);
    }
  }

  /* ---------------- resultado ---------------- */

  function estadoClase(estadoCalc) {
    if (estadoCalc === "estimado") return "calc-estado--estimado";
    if (estadoCalc === "pendiente") return "calc-estado--pendiente";
    return "calc-estado--manual";
  }

  function tituloResultado(estadoCalc) {
    if (estadoCalc === "estimado") return "Tu presupuesto estimado";
    if (estadoCalc === "pendiente") return "Estimación parcial de tu presupuesto";
    return "Tu proyecto necesita una cotización personalizada";
  }

  function respuestasReviewHTML() {
    var html = "";
    activas().forEach(function (q, i) {
      var valor = "";
      if (q.tipo === "multi") {
        valor = etiquetaFuncionalidades();
        if (q.textoSiSeleccion && estado.respuestas.integraciones_descripcion) {
          var sel = estado.respuestas.funcionalidades || [];
          if (sel.indexOf(q.textoSiSeleccion.paraId) !== -1) {
            valor += " (" + estado.respuestas.integraciones_descripcion + ")";
          }
        }
      } else if (q.tipo === "formulario") {
        var c = estado.respuestas.contacto || {};
        var partes = [];
        if (c.nombre) partes.push(c.nombre);
        if (c.tipo_negocio) partes.push(c.tipo_negocio);
        if (c.email) partes.push(c.email);
        if (c.presupuesto_disponible) partes.push("Presupuesto: " + c.presupuesto_disponible);
        valor = partes.join(" · ");
      } else if (q.id === "cantidad") {
        valor = etiquetaCantidad();
      } else if (q.id === "redaccion") {
        valor = etiquetaRedaccion();
      } else {
        valor = etiquetaUnica(q.id, estado.respuestas[q.id]);
      }
      if (!valor) valor = "Sin responder";
      html +=
        '<li class="calc-respuesta">' +
          '<div class="calc-respuesta-info">' +
            '<p class="calc-respuesta-label">' + esc(tituloDe(q, estado.respuestas)) + "</p>" +
            '<p class="calc-respuesta-valor">' + esc(valor) + "</p>" +
          "</div>" +
          '<button type="button" class="calc-btn-mini" data-modificar="' + esc(q.id) + '" data-indice="' + i + '">Modificar</button>' +
        "</li>";
    });
    return html;
  }

  function desgloseHTML(calc) {
    var html = "";
    calc.lineas.forEach(function (linea) {
      html +=
        '<div class="calc-fila">' +
          "<dt>" + esc(linea.etiqueta) + "</dt>" +
          "<dd>" + esc(linea.valor) +
            (linea.nota ? '<span class="calc-fila-nota">' + esc(linea.nota) + "</span>" : "") +
          "</dd>" +
        "</div>";
    });
    return html;
  }

  function totalHTML(calc) {
    if (calc.estado === "manual") {
      var motivos = calc.motivosManual
        .map(function (m) { return "<li>" + esc(m) + "</li>"; })
        .join("");
      return (
        '<section class="calc-total calc-total--manual">' +
          '<p class="calc-total-etiqueta">Cotización personalizada</p>' +
          '<p class="calc-total-texto">No corresponde un precio automático para este proyecto:</p>' +
          '<ul class="calc-motivos">' + motivos + "</ul>" +
          '<p class="calc-total-texto">Usá los botones de abajo para enviarme el detalle y recibir una propuesta.</p>' +
        "</section>"
      );
    }

    var parcial = calc.estado === "pendiente";
    var html =
      '<section class="calc-total ' + (parcial ? "calc-total--pendiente" : "calc-total--estimado") + '">' +
        '<p class="calc-total-etiqueta">' + (parcial ? "Estimación parcial (pendiente de cotización)" : "Total estimado") + "</p>" +
        '<p class="calc-total-valor">' + esc(CALC.engine.formatearImporte(calc.total)) + "</p>";

    if (calc.rango) {
      html +=
        '<p class="calc-total-rango">Rango estimado: ' +
          esc(CALC.engine.formatearImporte(calc.rango[0])) + " – " +
          esc(CALC.engine.formatearImporte(calc.rango[1])) + "</p>";
    }

    html += '<p class="calc-chip">Vigencia de la cotización: ' + esc(calc.vigenciaDias) + " días</p>";

    if (parcial) {
      html +=
        '<div class="calc-pendientes">' +
          '<p class="calc-pendientes-titulo">Puntos pendientes de definir:</p>' +
          "<ul>" + calc.pendientes.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
        "</div>";
      html += '<p class="calc-total-nota">Este importe es parcial: no es una cotización definitiva hasta confirmar estos puntos.</p>';
    }
    html += "</section>";
    return html;
  }

  function mantenimientoHTML() {
    var m = cfg.mantenimiento;
    return (
      '<section class="calc-bloque">' +
        "<h3>Servicios opcionales (no incluidos en el total)</h3>" +
        '<div class="calc-opcional">' +
          '<div class="calc-opcional-fila">' +
            '<p class="calc-opcional-nombre">' + esc(m.nombre) + "</p>" +
            '<p class="calc-opcional-precio">' + esc(CALC.engine.formatearImporte(m.precioMensual)) +
              "/" + esc(m.periodicidad) + "</p>" +
          "</div>" +
          '<p class="calc-chip calc-chip--pendiente">' + esc(m.estado) + "</p>" +
          '<p class="calc-nota">Periodicidad: mensual. No forma parte del total del desarrollo.</p>' +
        "</div>" +
        '<div class="calc-opcional">' +
          '<div class="calc-opcional-fila">' +
            '<p class="calc-opcional-nombre">Dominio y hosting</p>' +
            '<p class="calc-opcional-precio">Se contratan aparte</p>' +
          "</div>" +
          '<p class="calc-nota">Puedo ayudarte a contratarlos o gestionarlos como servicio adicional.</p>' +
        "</div>" +
      "</section>"
    );
  }

  function renderResultado(conFoco) {
    estado.vista = "resultado";
    var calc = CALC.engine.calcular(estado.respuestas);

    var lead = "";
    if (calc.estado === "estimado") {
      lead = "Según tus respuestas, este es el presupuesto estimado para tu proyecto.";
    } else if (calc.estado === "pendiente") {
      lead = "Este cálculo es parcial: hay puntos sin tarifrar que se definen en la conversación antes de cerrar la cotización.";
    }

    var observaciones = calc.observaciones.length
      ? '<div class="calc-observaciones"><ul>' +
          calc.observaciones.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") +
        "</ul></div>"
      : "";

    var incluidos = calc.incluidos.length
      ? '<section class="calc-bloque"><h3>Incluido en el precio</h3><ul class="calc-chips">' +
          calc.incluidos.map(function (i) { return '<li class="calc-chip-incluido">' + esc(i) + "</li>"; }).join("") +
        "</ul></section>"
      : "";

    var desglose = calc.lineas.length
      ? '<section class="calc-bloque"><h3>Desglose</h3><dl class="calc-desglose">' +
          desgloseHTML(calc) + "</dl></section>"
      : "";

    var emailBoton = hayEmailjs()
      ? '<button type="button" class="calc-btn calc-btn--secundario" data-accion="email">Enviar consulta por email</button>'
      : '<button type="button" class="calc-btn calc-btn--secundario" disabled aria-disabled="true">Enviar por email</button>' +
        '<p class="calc-email-nota">Configuración de email pendiente.</p>';

    var html =
      '<p class="calc-estado ' + estadoClase(calc.estado) + '">' +
        (calc.estado === "estimado" ? "Presupuesto estimado" :
         calc.estado === "pendiente" ? "Pendiente de cotización" : "Cotización personalizada") +
      "</p>" +
      '<h2 class="calc-resultado-titulo" id="resultado-titulo">' + esc(tituloResultado(calc.estado)) + "</h2>" +
      (lead ? '<p class="calc-resultado-lead">' + esc(lead) + "</p>" : "") +
      observaciones +
      '<section class="calc-bloque"><h3>Tus respuestas</h3><ul class="calc-respuestas">' +
        respuestasReviewHTML() + "</ul></section>" +
      desglose +
      totalHTML(calc) +
      incluidos +
      mantenimientoHTML() +
      '<p class="calc-disclaimer">' +
        "Esta estimación no es una cotización definitiva. La cotización tiene una vigencia de " +
        esc(calc.vigenciaDias) + " días y puede ajustarse según el alcance final, la disponibilidad del contenido y las revisiones acordadas. " +
        "Se incluyen 2 rondas de revisiones. El dominio y el hosting se contratan aparte." +
      "</p>" +
      '<div class="calc-acciones-finales">' +
        '<button type="button" class="calc-btn calc-btn--secundario" data-accion="copiar">Copiar resumen</button>' +
        '<a class="calc-btn calc-btn--primario" data-accion="whatsapp" target="_blank" rel="noopener noreferrer" href="' +
          esc(urlWhatsApp(calc)) + '">Consultar por WhatsApp</a>' +
        emailBoton +
        '<button type="button" class="calc-btn calc-btn--fantasma" data-accion="reiniciar">Reiniciar cuestionario</button>' +
      "</div>";

    els.resultado.innerHTML = html;
    els.resultado.hidden = false;
    els.cuestionario.hidden = true;
    renderProgreso();

    if (conFoco && !primerRender) els.resultado.focus();
  }

  /* ---------------- mensajes de contacto ---------------- */

  function datosParaMensajes() {
    var c = estado.respuestas.contacto || {};
    var r = estado.respuestas;
    return {
      nombre: c.nombre || "",
      tipoNegocio: c.tipo_negocio || "",
      email: c.email || "",
      descripcion: c.descripcion || "",
      presupuesto: etiquetaPresupuestoDisponible()
    };
  }

  function lineaProyecto() {
    var r = estado.respuestas;
    if (r.tipo_proyecto === "landing") return "Secciones: " + (etiquetaUnica("cantidad", r.cantidad) || "A definir");
    if (r.tipo_proyecto === "institucional") return "Páginas: " + (etiquetaCantidad() || "A definir");
    return "Productos: " + (etiquetaCantidad() || "A definir");
  }

  function estadoParaMensaje(calc) {
    if (calc.estado === "estimado") {
      return "Presupuesto estimado: " + CALC.engine.formatearImporte(calc.total) +
        " (vigencia de " + calc.vigenciaDias + " días; no es una cotización definitiva)";
    }
    if (calc.estado === "pendiente") {
      return "Presupuesto estimado (parcial): " + CALC.engine.formatearImporte(calc.total) +
        " — pendiente de cotización: " + calc.pendientes.join("; ");
    }
    return "Estado: requiere cotización personalizada (" + calc.motivosManual.join("; ") + ")";
  }

  function armarMensajeWhatsApp(descripcion, calc) {
    var d = datosParaMensajes();
    var partes = [
      "Hola Santiago, quiero solicitar un presupuesto para mi proyecto web.",
      "",
      "Nombre: " + d.nombre,
      "Tipo de negocio: " + d.tipoNegocio,
      "Tipo de proyecto: " + (calc.proyecto ? calc.proyecto.nombre : "A definir"),
      lineaProyecto(),
      "Diseño: " + (estado.respuestas.diseno ? etiquetaUnica("diseno", estado.respuestas.diseno) : "A definir"),
      "Funcionalidades: " + etiquetaFuncionalidades(),
      "Contenido: " + (estado.respuestas.contenido ? etiquetaUnica("contenido", estado.respuestas.contenido) : "A definir"),
      "Identidad visual: " + (estado.respuestas.identidad ? etiquetaUnica("identidad", estado.respuestas.identidad) : "A definir"),
      "Presupuesto disponible: " + d.presupuesto,
      "",
      "Descripción del proyecto:",
      descripcion,
      "",
      estadoParaMensaje(calc),
      "",
      "Email: " + d.email
    ];
    return partes.join("\n");
  }

  function mensajeWhatsApp(calc) {
    var descripcion = datosParaMensajes().descripcion;
    var msg = armarMensajeWhatsApp(descripcion, calc);
    /* WhatsApp no admite URLs indefinidas: acortamos la descripción
       de ser necesario (el resumen completo se copia al portapapeles). */
    var cortes = [400, 200, 100, 50];
    for (var i = 0; i < cortes.length && msg.length > 1800; i++) {
      msg = armarMensajeWhatsApp(descripcion.slice(0, cortes[i]) + "…", calc);
    }
    if (msg.length > 1800) {
      msg = armarMensajeWhatsApp("[Descripción completa: copiá el resumen y pégalo acá]", calc);
    }
    return msg;
  }

  function urlWhatsApp(calc) {
    return "https://wa.me/" + cfg.contacto.whatsapp + "?text=" + encodeURIComponent(mensajeWhatsApp(calc));
  }

  function armarResumen() {
    var calc = CALC.engine.calcular(estado.respuestas);
    var d = datosParaMensajes();
    var lineas = [];

    lineas.push("PRESUPUESTO — Santiago Gimenez (calculadora estimativa)");
    lineas.push("Fecha: " + new Date().toLocaleDateString(cfg.moneda.locale));
    lineas.push("");
    lineas.push("PROYECTO");
    lineas.push("Tipo: " + (calc.proyecto ? calc.proyecto.nombre : "A definir"));
    activas().forEach(function (q) {
      if (q.tipo === "formulario") return;
      var v;
      if (q.tipo === "multi") v = etiquetaFuncionalidades();
      else if (q.id === "cantidad") v = etiquetaCantidad();
      else v = etiquetaUnica(q.id, estado.respuestas[q.id]);
      if (v) lineas.push(tituloDe(q, estado.respuestas) + ": " + v);
    });
    if (estado.respuestas.integraciones_descripcion) {
      lineas.push("Integraciones: " + estado.respuestas.integraciones_descripcion);
    }
    lineas.push("Presupuesto disponible: " + d.presupuesto);
    lineas.push("");
    lineas.push("DATOS DE CONTACTO");
    lineas.push("Nombre: " + d.nombre);
    lineas.push("Tipo de negocio: " + d.tipoNegocio);
    lineas.push("Email: " + d.email);
    lineas.push("Descripción: " + d.descripcion);
    lineas.push("");
    lineas.push("ESTIMACIÓN");

    if (calc.estado === "manual") {
      lineas.push("Estado: requiere cotización personalizada.");
      calc.motivosManual.forEach(function (m) { lineas.push(" - " + m); });
    } else {
      calc.lineas.forEach(function (l) {
        lineas.push(l.etiqueta + ": " + l.valor + (l.nota ? " (" + l.nota + ")" : ""));
      });
      lineas.push("Total estimado: " + CALC.engine.formatearImporte(calc.total));
      if (calc.rango) {
        lineas.push("Rango estimado: " + CALC.engine.formatearImporte(calc.rango[0]) +
          " – " + CALC.engine.formatearImporte(calc.rango[1]));
      }
      lineas.push("Vigencia de la cotización: " + calc.vigenciaDias + " días");
      if (calc.estado === "pendiente") {
        lineas.push("Estado: PENDIENTE DE COTIZACIÓN (importes parciales):");
        calc.pendientes.forEach(function (p) { lineas.push(" - " + p); });
      }
    }
    if (calc.observaciones.length) {
      lineas.push("");
      calc.observaciones.forEach(function (o) { lineas.push("Nota: " + o); });
    }
    if (calc.incluidos.length) {
      lineas.push("");
      lineas.push("Incluido en el precio: " + calc.incluidos.join(", "));
    }
    lineas.push("");
    lineas.push("OPCIONALES NO INCLUIDOS");
    lineas.push("Mantenimiento web: " + CALC.engine.formatearImporte(cfg.mantenimiento.precioMensual) +
      "/" + cfg.mantenimiento.periodicidad + " (" + cfg.mantenimiento.estado + ")");
    lineas.push("Dominio y hosting: se contratan aparte.");
    lineas.push("");
    lineas.push("Aclaración: esta estimación no es una cotización definitiva.");
    return lineas.join("\n");
  }

  /* ---------------- acciones ---------------- */

  function toast(texto) {
    els.toast.textContent = texto;
    els.toast.classList.add("calc-toast--visible");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () {
      els.toast.classList.remove("calc-toast--visible");
    }, 3200);
  }

  function copiarResumen() {
    var texto = armarResumen();
    function ok() { toast("Resumen copiado al portapapeles."); }
    function fallo() {
      toast("No se pudo copiar. Seleccioná el texto del resumen manualmente.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(ok).catch(function () {
        fallback();
      });
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = texto;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var bien = false;
      try { bien = document.execCommand("copy"); } catch (e) { bien = false; }
      document.body.removeChild(ta);
      bien ? ok() : fallo();
    }
  }

  function enviarEmail() {
    if (!hayEmailjs()) return;
    var e = cfg.contacto.emailjs;
    var calc = CALC.engine.calcular(estado.respuestas);
    var d = datosParaMensajes();

    var botones = els.resultado.querySelectorAll('[data-accion="email"]');
    var btn = botones[0];
    var textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Enviando…";

    fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: e.serviceId,
        template_id: e.templateId,
        user_id: e.publicKey,
        template_params: {
          nombre: d.nombre,
          email: d.email,
          reply_to: d.email,
          tipo_negocio: d.tipoNegocio,
          tipo_proyecto: calc.proyecto ? calc.proyecto.nombre : "A definir",
          presupuesto_disponible: d.presupuesto,
          descripcion: d.descripcion,
          estado: calc.estado,
          precio_estimado: calc.total !== null ? CALC.engine.formatearImporte(calc.total) : "Cotización personalizada",
          respuestas: armarResumen()
        }
      })
    })
      .then(function (resp) {
        if (!resp.ok) {
          return resp.text().then(function (t) { throw new Error(t || resp.status); });
        }
        toast("Consulta enviada por email.");
      })
      .catch(function (err) {
        console.error("EmailJS:", err);
        toast("No se pudo enviar el email. Copiá el resumen y consultame por WhatsApp.");
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = textoOriginal;
      });
  }

  function reiniciar() {
    estado = nuevoEstado();
    els.resultado.hidden = true;
    els.resultado.innerHTML = "";
    els.cuestionario.hidden = false;
    renderPaso(true);
    if (els.cuestionario.scrollIntoView) {
      els.cuestionario.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    }
    toast("Cuestionario reiniciado.");
  }

  /* ---------------- eventos ---------------- */

  function bindGlobal() {
    /* Navegación dentro de un paso. */
    els.pasoContenedor.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-accion]");
      if (!btn) return;
      if (btn.getAttribute("data-accion") === "siguiente") siguiente();
      if (btn.getAttribute("data-accion") === "atras") atras();
    });

    /* Selección de opciones: muestra/oculta campos condicionales. */
    els.pasoContenedor.addEventListener("change", function (ev) {
      var input = ev.target;
      if (!input.name) return;
      var q = activas()[estado.paso];
      if (!q || input.name !== q.id) return;

      if (q.id === "cantidad") {
        var wrap = els.pasoContenedor.querySelector('[data-extra="numero"]');
        if (wrap) {
          wrap.hidden = input.value !== "varias";
          if (input.value === "varias") {
            var num = els.pasoContenedor.querySelector("#calc-numero");
            if (num && !num.value) num.focus();
          }
        }
      }
      if (q.id === "redaccion" && q.inputNumero) {
        var cajaR = els.pasoContenedor.querySelector('[data-extra="redaccion"]');
        if (cajaR) {
          var mostrarR = input.value === q.inputNumero.paraValor;
          cajaR.hidden = !mostrarR;
          if (mostrarR) {
            var numR = els.pasoContenedor.querySelector("#calc-redaccion-paginas");
            if (numR && !numR.value) numR.focus();
          } else {
            var campoR = els.pasoContenedor.querySelector("#calc-redaccion-paginas");
            if (campoR) {
              campoR.value = "";
              delete estado.respuestas.redaccion_paginas;
            }
          }
        }
      }
      if (q.tipo === "multi" && q.textoSiSeleccion) {
        var t = q.textoSiSeleccion;
        var caja = els.pasoContenedor.querySelector('[data-extra="texto"]');
        if (caja) {
          var seleccionado = false;
          els.pasoContenedor.querySelectorAll('input[name="' + q.id + '"]:checked').forEach(function (i) {
            if (i.value === t.paraId) seleccionado = true;
          });
          caja.hidden = !seleccionado;
          if (!seleccionado) {
            var ta = els.pasoContenedor.querySelector("#calc-texto-extra");
            if (ta) {
              ta.value = "";
              delete estado.respuestas.integraciones_descripcion;
            }
          }
        }
      }
    });

    /* Acciones de la pantalla de resultado. */
    els.resultado.addEventListener("click", function (ev) {
      var modificar = ev.target.closest("[data-modificar]");
      if (modificar) {
        estado.paso = parseInt(modificar.getAttribute("data-indice"), 10);
        estado.vista = "paso";
        els.resultado.hidden = true;
        els.cuestionario.hidden = false;
        renderPaso(true);
        return;
      }
      var btn = ev.target.closest("[data-accion]");
      if (!btn) return;
      var accion = btn.getAttribute("data-accion");
      if (accion === "copiar") copiarResumen();
      if (accion === "email") enviarEmail();
      if (accion === "reiniciar") reiniciar();
      /* whatsapp: el <a> navega por su href (solo al pulsar). */
    });
  }

  /* ---------------- inicio ---------------- */

  function init() {
    cfg = CALC.config;
    preguntas = CALC.questions;

    els.pasoContenedor = document.getElementById("step-container");
    els.cuestionario = document.getElementById("cuestionario");
    els.resultado = document.getElementById("resultado");
    els.progresoBar = document.getElementById("progress-bar");
    els.progresoTexto = document.getElementById("progress-label");
    els.progresoRelleno = document.getElementById("progress-fill");
    els.toast = document.getElementById("toast");

    if (!els.pasoContenedor) return;
    bindGlobal();
    renderPaso(false);
  }

  init();
})();
