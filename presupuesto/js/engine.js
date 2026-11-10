/* =============================================================
   Calculadora de presupuestos — motor de cálculo
   -------------------------------------------------------------
   Lógica pura: no accede al DOM ni define interfaz.
   Entrada: objeto de respuestas. Salida: desglose + estado.

   Estados (equivalencia con la especificación del propietario):
     "estimado"  → estimated         todos los conceptos tarifados:
                                     total estimado completo
     "pendiente" → partial_estimate  hay conceptos tarifados y otros que
                                     requieren cotización manual: se muestra
                                     el SUBTOTAL de lo tarifado + la lista de
                                     pendientes; nunca se presenta como
                                     total definitivo ni suma lo pendiente
     "manual"    → manual_quote      no existe una base aplicable para
                                     calcular un subtotal: cotización
                                     personalizada, sin importes

   Reglas comerciales aplicadas (definidas por el propietario):
     - Landing ARS 200.000 con hasta 5 secciones de contenido
       (header y footer no cuentan); de 6 a 10 secciones suman
       ARS 40.000; alcance sin definir → estimación parcial
     - Institucional ARS 350.000 con hasta 4 páginas incluidas;
       ARS 40.000 por cada página adicional; cantidad sin definir →
       estimación parcial (subtotal con el estándar de 4 páginas)
     - Catálogo ARS 320.000 con hasta 10 productos incluidos;
       más de 10 → estimación parcial (sin tarifa por producto extra)
     - Redacción comercial básica de textos incluida en el precio
       base (sin investigaciones especializadas, traducciones ni
       contenido técnico complejo; las 2 rondas de revisiones
       también aplican a los textos)
     - Todo concepto sin tarifa definida (reseñas de Google,
       logo/branding, funciones sin tarifa, productos o páginas
       extra) se LISTA como pendiente de cotización y NO bloquea
       el subtotal ni se presenta como incluido gratuitamente
     - Derivación a cotización manual COMPLETA (sin subtotal):
       ecommerce (pagos, carrito, stock) y función a medida
       (desarrollo complejo) — derivaciones manuales existentes
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

  /* Conceptos que derivan el proyecto COMPLETO a cotización
     personalizada (manual_quote): no existe una base aplicable para
     calcular un subtotal. Solo dos casos:
       - ecommerce (pagos, carrito, stock)
       - función especial a medida (desarrollo complejo)
     Todo otro concepto sin tarifa definida se maneja como
     "pendientes de cotización" y NO oculta el subtotal (calcular). */
  function motivosManual(r) {
    var motivos = [];
    if (!r || !r.tipo_proyecto) return motivos;

    if (r.ecommerce === "si") {
      motivos.push("Venta online con pagos, carrito de compras o gestión de stock");
    }
    if ((r.funcionalidades || []).indexOf("a_medida") !== -1) {
      motivos.push("Función especial a medida: desarrollo complejo que requiere evaluar el proyecto");
    }
    return motivos;
  }

  /* Textos por concepto seleccionado sin tarifa definida para el
     alcance contratado (pendiente de cotización). Casos con
     explicación comercial específica; el resto, genérico. */
  function textoPendienteAdicional(f, r) {
    if (f.id === "testimonios") {
      return "Reseñas de Google Maps: se evalúa según tu perfil y plan de Google; se cotiza aparte";
    }
    if (f.id === "idioma_extra" && r.tipo_proyecto === "institucional" && r.cantidad === "varias") {
      var tope = cfg().proyectos.institucional.paginasIncluidas;
      return "Sitio en dos idiomas con más de " + tope + " páginas: alcance mayor al estándar, se cotiza aparte";
    }
    return f.nombre + ": se cotiza aparte";
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

    /* --- Derivaciones a cotización manual COMPLETA (sin subtotal) --- */
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
      if (r.cantidad === "pocas") {
        res.lineas.push({
          etiqueta: "Secciones",
          valor: "Hasta " + p.seccionesIncluidas + " secciones",
          nota: "Incluidas en el precio base."
        });
      } else if (r.cantidad === "muchas") {
        /* Banda fija de 6 a 10 secciones: un solo adicional, nunca por sección. */
        adicionales += p.seccionesAdicional;
        res.lineas.push({
          etiqueta: "Secciones (de " + (p.seccionesIncluidas + 1) + " a " + p.seccionesRangoHasta + ")",
          valor: formatearImporte(p.seccionesAdicional),
          nota: "Adicional sobre el precio base: hasta " + p.seccionesIncluidas + " incluidas."
        });
      } else if (r.cantidad === "no_se") {
        res.lineas.push({
          etiqueta: "Secciones",
          valor: "Alcance por definir",
          nota: "Estimación sujeta a confirmación del alcance."
        });
        res.pendientes.push("Alcance de secciones sin definir: el total es estimativo y queda sujeto a confirmación.");
      }
    } else if (r.tipo_proyecto === "institucional") {
      if (r.cantidad === "hasta_4") {
        res.lineas.push({
          etiqueta: "Páginas",
          valor: "Hasta " + p.paginasIncluidas + " páginas",
          nota: "Incluidas en el precio base."
        });
      } else if (r.cantidad === "no_se") {
        res.lineas.push({
          etiqueta: "Páginas",
          valor: "Alcance por definir",
          nota: "Hasta " + p.paginasIncluidas + " páginas incluidas en el precio base."
        });
        res.pendientes.push("Cantidad de páginas sin definir: el subtotal considera " + p.paginasIncluidas + " páginas y se ajusta al definir el alcance.");
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
      } else if (r.cantidad === "mas_10") {
        res.lineas.push({
          etiqueta: "Productos",
          valor: "Más de " + p.productosIncluidos + " productos",
          nota: "El subtotal considera hasta " + p.productosIncluidos + " productos incluidos."
        });
        res.pendientes.push("Más de " + p.productosIncluidos + " productos: la tarifa por producto adicional se cotiza aparte.");
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

      /* Sin tarifa definida para este alcance → pendiente de
         cotización: no bloquea el subtotal ni se cuenta como incluido. */
      var sinTarifa = pr === "manual" ||
        (fid === "idioma_extra" && r.tipo_proyecto === "institucional" && r.cantidad === "varias");
      if (sinTarifa) {
        res.lineas.push({ etiqueta: f.nombre, valor: "Pendiente de cotización" });
        res.pendientes.push(textoPendienteAdicional(f, r));
        return;
      }
      if (typeof pr === "number") {
        adicionales += pr;
        /* Line item con descripción de alcance (nota) si el adicional la define. */
        var detalle = { etiqueta: f.nombre, valor: formatearImporte(pr) };
        if (f.nota) detalle.nota = f.nota;
        res.lineas.push(detalle);
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
    /* La redacción comercial básica de textos está incluida en el
       precio base: no existe adicional de preparación de contenido
       (el importe asociado se eliminó de config.js). */
    var contenido = buscarPorId(c.contenidos, r.contenido);
    if (contenido) {
      res.lineas.push({ etiqueta: "Contenido", valor: contenido.nombre });
    }

    /* --- Branding: logo e identidad visual ---
       Crearlo o mejorarlo es un adicional sin tarifa definida:
       se LISTA como pendiente de cotización (no bloquea el subtotal,
       no se cuenta como incluido y no suma importes desconocidos). */
    var identidad = buscarPorId(c.identidades, r.identidad);
    if (identidad) {
      if (identidad.id === "parcial" || identidad.id === "ninguna") {
        res.lineas.push({ etiqueta: "Branding (logo e identidad visual)", valor: "Pendiente de cotización" });
        res.pendientes.push("Creación o mejora de logo e identidad visual: requiere cotización personalizada (no está incluida en el subtotal).");
      }
      if (identidad.observacion) {
        res.observaciones.push(identidad.observacion);
      }
    }

    /* --- Total y estado ---
       pendiente = partial_estimate: subtotal de lo tarifado + pendientes. */
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
