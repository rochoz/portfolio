/* =============================================================
   Calculadora de presupuestos — motor de cálculo
   -------------------------------------------------------------
   Lógica pura: no accede al DOM ni define interfaz.
   Entrada: objeto de respuestas. Salida: desglose + estado.

   Estados:
     "estimado" → total completo, con vigencia de cotización
     "pendiente"→ total PARCIAL: hay adicionales sin tarifa definida;
                  nunca se presenta como cotización definitiva
     "manual"   → sin total automático: cotización personalizada

   Reglas comerciales aplicadas (definidas por el propietario):
     - Landing ARS 200.000 (tarifa plana; secciones sin cargo)
     - Institucional ARS 350.000 con hasta 4 páginas incluidas;
       ARS 40.000 por cada página adicional
     - Catálogo ARS 320.000 con hasta 10 productos incluidos
     - Más de 10 productos, páginas desconocidas, ecommerce y
       desarrollos a medida → cotización manual
     - Sin estimar horas: no hay cargos por tiempo.
   ============================================================= */

var CALC = CALC || {};

CALC.engine = (function () {
  "use strict";

  function cfg() {
    return CALC.config;
  }

  function formatearImporte(valor) {
    var c = cfg();
    var n = new Intl.NumberFormat(c.moneda.locale).format(Math.round(valor));
    return c.moneda.prefijo + n;
  }

  /* Normaliza una regla pricing según el proyecto. */
  function pricingDe(regla, proyecto) {
    if (regla === undefined || regla === null) return "pendiente";
    if (typeof regla === "object") {
      var v = regla[proyecto];
      return v === undefined ? "pendiente" : v;
    }
    return regla;
  }

  function buscarPorId(lista, id) {
    if (!lista || !id) return null;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) return lista[i];
    }
    return null;
  }

  /* Motivos que derivan el proyecto a cotización personalizada.
     Se usa tanto para ocultar preguntas irrelevantes (app) como
     para el resultado (calcular). */
  function motivosManual(r) {
    var motivos = [];
    if (!r || !r.tipo_proyecto) return motivos;

    if (r.ecommerce === "si") {
      motivos.push("Venta online con pagos, carrito de compras o gestión de stock");
    }
    if (r.tipo_proyecto === "institucional" && r.cantidad === "no_se") {
      motivos.push("Cantidad de páginas sin definir");
    }
    if (r.tipo_proyecto === "catalogo" && r.cantidad === "mas_10") {
      motivos.push("Más de 10 productos en el catálogo");
    }
    /* Catálogo: la redacción de fichas de producto se cotiza aparte. */
    var reglasRed = cfg().redaccion || {};
    var reglaRed = reglasRed[r.tipo_proyecto];
    if (r.redaccion === "si" && reglaRed && reglaRed.modo === "manual") {
      motivos.push("Redacción de fichas de producto: se cotiza aparte");
    }
    if ((r.funcionalidades || []).indexOf("a_medida") !== -1) {
      motivos.push("Función especial a medida a evaluar");
    }
    return motivos;
  }

  /* ¿La derivación a manual ocurre antes del contacto (solo ecommerce)?
     En ese caso se salta el resto de las preguntas de alcance. */
  function derivaTemprano(r) {
    return r && r.ecommerce === "si";
  }

  function calcular(r) {
    var c = cfg();
    r = r || {};

    var res = {
      estado: "estimado",
      proyecto: null,
      base: null,
      adicionales: 0,
      total: null,
      rango: null,
      lineas: [],
      incluidos: [],
      pendientes: [],
      motivosManual: [],
      observaciones: [],
      vigenciaDias: c.vigenciaDias
    };

    var p = c.proyectos[r.tipo_proyecto];
    if (!p) {
      res.estado = "manual";
      res.motivosManual.push("Tipo de proyecto sin definir");
      return res;
    }

    res.proyecto = { id: r.tipo_proyecto, nombre: p.nombre };
    res.incluidos = p.incluye.slice();

    /* --- Derivaciones a cotización manual (sin total) --- */
    res.motivosManual = motivosManual(r);
    if (res.motivosManual.length) {
      res.estado = "manual";
      return res;
    }

    /* --- Precio base --- */
    res.base = p.precioBase;
    res.lineas.push({
      etiqueta: "Precio base — " + p.nombre,
      valor: formatearImporte(p.precioBase)
    });

    var adicionales = 0;

    /* --- Cantidad: páginas / secciones / productos --- */
    if (r.tipo_proyecto === "landing") {
      /* Tarifa plana: las secciones no modifican el precio. */
    } else if (r.tipo_proyecto === "institucional") {
      if (r.cantidad === "hasta_4") {
        res.lineas.push({
          etiqueta: "Páginas",
          valor: "Hasta " + p.paginasIncluidas + " páginas",
          nota: "Incluidas en el precio base."
        });
      } else if (r.cantidad === "varias") {
        var n = parseInt(r.paginas_numero, 10);
        if (!isNaN(n)) {
          res.lineas.push({ etiqueta: "Cantidad de páginas", valor: String(n) });
          var extra = n - p.paginasIncluidas;
          if (extra > 0) {
            var importe = extra * p.precioPaginaAdicional;
            adicionales += importe;
            res.lineas.push({
              etiqueta: "Páginas adicionales (" + extra + ")",
              valor: formatearImporte(importe),
              nota:
                "Hasta " + p.paginasIncluidas + " páginas incluidas; " +
                formatearImporte(p.precioPaginaAdicional) + " por página adicional."
            });
          }
        }
      }
    } else if (r.tipo_proyecto === "catalogo") {
      if (r.cantidad === "hasta_10") {
        res.lineas.push({
          etiqueta: "Productos",
          valor: "Hasta " + p.productosIncluidos + " productos",
          nota: "Incluidos en el precio base."
        });
      } else if (r.cantidad === "no_se") {
        res.lineas.push({
          etiqueta: "Productos",
          valor: "Cantidad a definir",
          nota: "Hasta " + p.productosIncluidos + " productos incluidos en el precio base."
        });
        res.pendientes.push("Cantidad de productos sin definir: verificar antes de cerrar el alcance.");
      }
    }

    /* --- Diseño --- */
    var diseno = buscarPorId(c.disenos, r.diseno);
    if (diseno) {
      res.lineas.push({
        etiqueta: "Diseño",
        valor: diseno.nombre,
        nota: diseno.pricing === "incluida" ? "Incluido en el precio base." : diseno.nota || ""
      });
    }
    var animaciones = r.diseno === "avanzado" || (r.funcionalidades || []).indexOf("animaciones") !== -1;
    if (animaciones) {
      res.pendientes.push("Animaciones avanzadas: alcance y tarifa a definir");
    }

    /* --- Funcionalidades --- */
    var funcs = r.funcionalidades || [];
    funcs.forEach(function (fid) {
      if (fid === "animaciones") return; // regla conjunta con el diseño (más abajo)
      var f = buscarPorId(c.funcionalidades, fid);
      if (!f) return;
      var pr = pricingDe(f.pricing, r.tipo_proyecto);

      if (pr === "manual") {
        res.motivosManual.push(f.nombre + ": se evalúa caso por caso");
        return;
      }
      if (typeof pr === "number") {
        adicionales += pr;
        res.lineas.push({ etiqueta: f.nombre, valor: formatearImporte(pr) });
        return;
      }
      if (pr === "incluida") {
        res.lineas.push({ etiqueta: f.nombre, valor: "Incluido" });
        return;
      }
      /* pendiente: sin tarifa definida → jamás genera importe. */
      var detalle = "";
      if (fid === "integraciones" && r.integraciones_descripcion) {
        detalle = " — " + r.integraciones_descripcion;
      }
      res.lineas.push({ etiqueta: f.nombre, valor: "Pendiente de cotización" });
      res.pendientes.push(f.nombre + ": sin tarifa definida" + detalle);
    });

    /* --- Contenido --- */
    var desdeCero = r.contenido === "desde_cero";
    if (desdeCero) {
      var contenidoCero = buscarPorId(c.contenidos, "desde_cero");
      res.lineas.push({
        etiqueta: "Contenido",
        valor: "Preparación desde cero",
        nota: contenidoCero && typeof contenidoCero.pricing === "number"
          ? formatearImporte(contenidoCero.pricing)
          : ""
      });
      if (typeof contenidoCero.pricing === "number") {
        adicionales += contenidoCero.pricing;
      } else {
        res.pendientes.push("Preparación de contenido desde cero: sin tarifa definida");
      }
    } else {
      var contenido = buscarPorId(c.contenidos, r.contenido);
      if (contenido) {
        res.lineas.push({ etiqueta: "Contenido", valor: contenido.nombre });
      }
    }

    /* --- Redacción de textos (regla propia, calculada por alcance) --- */
    if (r.redaccion === "si") {
      var regla = c.redaccion[r.tipo_proyecto];
      if (!regla) {
        res.pendientes.push("Redacción de textos: sin regla definida para este tipo de proyecto");
      } else if (regla.modo === "manual") {
        /* Catálogo: las fichas de producto se cotizan aparte. */
        res.motivosManual.push("Redacción de fichas de producto: se cotiza aparte");
      } else if (desdeCero && c.reglas.redaccionCubiertaSiContenidoDesdeCero) {
        /* Anti-duplicación: la preparación desde cero ya cubre los textos. */
        res.lineas.push({
          etiqueta: "Redacción de textos",
          valor: "Incluida",
          nota: "Cubierta por la preparación de contenido desde cero."
        });
      } else if (regla.modo === "plano") {
        if (typeof regla.precio === "number") {
          adicionales += regla.precio;
          res.lineas.push({
            etiqueta: "Redacción de textos",
            valor: formatearImporte(regla.precio),
            nota: "Tarifa por la landing completa."
          });
        } else {
          res.lineas.push({ etiqueta: "Redacción de textos", valor: "Pendiente de cotización" });
          res.pendientes.push("Redacción de textos: sin tarifa definida");
        }
      } else {
        /* por_pagina: se cobra según las páginas indicadas, con tope
           en el total de páginas contratadas por el cliente. */
        var tope = CALC.topePaginas(r);
        var pedidas = parseInt(r.redaccion_paginas, 10);
        if (isNaN(pedidas) || pedidas < 1) {
          res.lineas.push({ etiqueta: "Redacción de textos", valor: "Pendiente de cotización" });
          res.pendientes.push("Redacción de textos: falta indicar cuántas páginas");
        } else {
          var efectivas = pedidas;
          if (tope > 0 && pedidas > tope) {
            efectivas = tope;
            res.observaciones.push(
              "Pediste redacción para " + pedidas + " páginas, pero el proyecto contempla " + tope +
              ". Se cotiza sobre " + tope + " páginas: para el resto podemos ampliar el alcance."
            );
          }
          if (typeof regla.precioPorPagina === "number") {
            var importeRed = efectivas * regla.precioPorPagina;
            adicionales += importeRed;
            res.lineas.push({
              etiqueta: "Redacción de textos (" + efectivas + (efectivas === 1 ? " página" : " páginas") + ")",
              valor: formatearImporte(importeRed),
              nota: formatearImporte(regla.precioPorPagina) + " por página."
            });
          } else {
            res.lineas.push({ etiqueta: "Redacción de textos", valor: "Pendiente de cotización" });
            res.pendientes.push("Redacción de textos: sin tarifa por página definida");
          }
        }
      }
    }

    /* --- Identidad visual: solo observación, nunca cargo automático --- */
    var identidad = buscarPorId(c.identidades, r.identidad);
    if (identidad && identidad.observacion) {
      res.observaciones.push(identidad.observacion);
    }

    /* --- Total y estado --- */
    res.adicionales = adicionales;
    res.total = res.base + adicionales;
    res.estado = res.pendientes.length ? "pendiente" : "estimado";

    /* --- Margen de incertidumbre (configurable; null = no se muestra) --- */
    if (c.margenIncertidumbre !== null && c.margenIncertidumbre > 0 && res.total !== null) {
      var m = c.margenIncertidumbre;
      res.rango = [
        Math.round(res.total * (1 - m) / 1000) * 1000,
        Math.round(res.total * (1 + m) / 1000) * 1000
      ];
    }

    /* --- Comparación con rangos de inversión (solo si están configurados).
           Nunca altera el precio calculado. --- */
    if (c.rangosInversion.length && res.total !== null) {
      var maxima = 0;
      var dentro = false;
      c.rangosInversion.forEach(function (rg) {
        if (typeof rg.max === "number") maxima = Math.max(maxima, rg.max);
        var cumpleMin = typeof rg.min !== "number" || res.total >= rg.min;
        var cumpleMax = typeof rg.max !== "number" || res.total <= rg.max;
        if (cumpleMin && cumpleMax) dentro = true;
      });
      if (!dentro && res.total > maxima) {
        res.observaciones.push(
          "Tu inversión disponible parece inferior al alcance solicitado. Puedo proponerte alternativas para ajustar el proyecto; el precio del trabajo acordado no se reduce."
        );
      }
    }

    return res;
  }

  return {
    calcular: calcular,
    formatearImporte: formatearImporte,
    motivosManual: motivosManual,
    derivaTemprano: derivaTemprano,
    pricingDe: pricingDe,
    buscarPorId: buscarPorId
  };
})();
