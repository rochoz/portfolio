/* =============================================================
   Calculadora de presupuestos — definición del cuestionario
   -------------------------------------------------------------
   Una pregunta por pantalla. Lenguaje comercial, sin jerga técnica.
   - opciones: array o función(respuestas) => array (adaptación por tipo)
   - cuando(respuestas): muestra u oculta la pregunta (condicionales)
   - Sin importes: los precios viven únicamente en CALC.config.
   ============================================================= */

var CALC = CALC || {};

/* Total de páginas contratadas por el cliente (tope para la redacción).
   Landing = 1 página; institucional = 4 base o las que haya indicado. */
function topePaginas(r) {
  if (!r || !r.tipo_proyecto) return 0;
  if (r.tipo_proyecto === "landing") return 1;
  if (r.tipo_proyecto === "institucional") {
    if (r.cantidad === "varias") {
      var n = parseInt(r.paginas_numero, 10);
      return isNaN(n) ? 0 : n;
    }
    return CALC.config.proyectos.institucional.paginasIncluidas;
  }
  return 0;
}

CALC.topePaginas = topePaginas;

CALC.questions = [
  {
    id: "tipo_proyecto",
    tipo: "unica",
    titulo: "¿Qué tipo de sitio web necesitás?",
    sub: "Elegí la opción que más se parezca a lo que tenés en mente.",
    opciones: [
      {
        valor: "landing",
        etiqueta: "Landing page",
        desc: "Una página enfocada en presentar tu negocio o una propuesta y conseguir consultas."
      },
      {
        valor: "institucional",
        etiqueta: "Sitio institucional",
        desc: "Un sitio con varias páginas para presentar tu empresa, estudio o servicios."
      },
      {
        valor: "catalogo",
        etiqueta: "Catálogo de productos",
        desc: "Para mostrar productos con imágenes, precios y categorías, con consultas por WhatsApp."
      }
    ]
  },

  {
    id: "ecommerce",
    tipo: "unica",
    titulo: "¿Tu proyecto necesita pagos online, carrito de compras o stock?",
    sub: "Los sitios con venta online se cotizan de forma personalizada: no calculamos un precio automático.",
    opciones: [
      {
        valor: "no",
        etiqueta: "No, solo consultas",
        desc: "Las personas te contactan por WhatsApp o por formulario."
      },
      {
        valor: "si",
        etiqueta: "Sí, lo necesita",
        desc: "Deriva el proyecto a una cotización personalizada.",
        destacada: true
      }
    ]
  },

  {
    id: "cantidad",
    tipo: "unica",
    /* Derivación temprana por ecommerce: el resto del alcance no aplica. */
    cuando: function (r) {
      return r.ecommerce !== "si";
    },
    /* Se adapta al tipo de proyecto elegido en la pregunta 1. */
    titulo: function (r) {
      if (r.tipo_proyecto === "landing") return "¿Cuántas secciones necesitás en tu página?";
      if (r.tipo_proyecto === "institucional") return "¿Cuántas páginas va a tener tu sitio?";
      return "¿Cuántos productos aproximadamente vas a mostrar?";
    },
    sub: function (r) {
      if (r.tipo_proyecto === "landing") {
        return "Una landing es una sola página: las secciones no se cuentan como páginas independientes.";
      }
      return "Según esta respuesta calculamos el precio o derivamos a cotización personalizada.";
    },
    opciones: function (r) {
      if (r.tipo_proyecto === "landing") {
        return [
          { valor: "pocas", etiqueta: "Contenido en pocas secciones", desc: "Una propuesta concentrada y directa." },
          { valor: "muchas", etiqueta: "Varias secciones de contenido", desc: "Más detalle sobre tu negocio o servicio." },
          { valor: "no_se", etiqueta: "Todavía no lo sé", desc: "Lo definimos en la conversación." }
        ];
      }
      if (r.tipo_proyecto === "institucional") {
        return [
          { valor: "hasta_4", etiqueta: "Hasta 4 páginas", desc: "Está incluido en el precio base." },
          { valor: "varias", etiqueta: "De 5 páginas en adelante", desc: "Cada página adicional suma AR$40.000.", numero: true },
          { valor: "no_se", etiqueta: "Todavía no lo sé", desc: "Se define en la conversación con una cotización personalizada." }
        ];
      }
      return [
        { valor: "hasta_10", etiqueta: "Hasta 10 productos", desc: "Está incluido en el precio base." },
        { valor: "mas_10", etiqueta: "Más de 10 productos", desc: "Se cotiza según el alcance del catálogo." },
        { valor: "no_se", etiqueta: "Todavía no lo sé", desc: "Lo definimos en la conversación." }
      ];
    },
    inputNumero: {
      etiqueta: "¿Cuántas páginas va a tener?",
      placeholder: "Ej: 6",
      min: 5
    }
  },

  {
    id: "diseno",
    tipo: "unica",
    cuando: function (r) {
      return r.ecommerce !== "si";
    },
    titulo: "¿Qué tipo de diseño buscás?",
    sub: "Todos incluyen adaptación a celular, tablet y escritorio.",
    /* Opciones desde la configuración comercial. */
    desdeConfig: "disenos"
  },

  {
    id: "funcionalidades",
    tipo: "multi",
    cuando: function (r) {
      return r.ecommerce !== "si";
    },
    titulo: "¿Qué funcionalidades necesitás?",
    sub: "Podés seleccionar varias o ninguna. Cada una se explica en simple. Algunas todavía no tienen tarifa definida: si las elegís, el presupuesto queda marcado como pendiente de cotización.",
    desdeConfig: "funcionalidades",
    ayudaMulti: "No hace falta que elijas ninguna si no la necesitás.",
    textoSiSeleccion: {
      paraId: "integraciones",
      etiqueta: "Contame brevemente qué herramienta o servicio necesitás integrar",
      placeholder: "Ej: sistema de turnos, newsletter, herramienta de turnos, publicidad…",
      requerido: true,
      error: "Contanos qué herramienta o servicio necesitás integrar para poder evaluarlo."
    }
  },

  {
    id: "contenido",
    tipo: "unica",
    cuando: function (r) {
      return r.ecommerce !== "si";
    },
    titulo: "¿Con qué contenido contás?",
    sub: "Sirve para organizar el trabajo sin cobrar dos veces por lo mismo.",
    desdeConfig: "contenidos"
  },

  {
    id: "redaccion",
    tipo: "unica",
    cuando: function (r) {
      /* Solo landing e institucional cotizan redacción automáticamente.
         En catálogo (fichas de producto) se deriva a cotización manual. */
      return r.ecommerce !== "si" && (r.tipo_proyecto === "landing" || r.tipo_proyecto === "institucional");
    },
    titulo: function (r) {
      if (r.tipo_proyecto === "landing") return "¿Necesitás que escriba los textos de la página?";
      return "¿Necesitás que escriba los textos del sitio?";
    },
    sub: function (r) {
      if (r.tipo_proyecto === "landing") {
        return "Si preferís encargarte vos del contenido, elegí la primera opción.";
      }
      return "Podés pedir redacción para todas las páginas o solo para algunas.";
    },
    /* Opciones estáticas: no dependen de tarifas (las tarifas viven en config). */
    opciones: function (r) {
      if (r.tipo_proyecto === "landing") {
        return [
          { valor: "no", etiqueta: "No, me encargo yo del contenido", desc: "Escribo o consigo los textos por mi cuenta." },
          { valor: "si", etiqueta: "Sí, redacción de la landing completa", desc: "Se cotiza una tarifa por la página completa.", cantidad: false }
        ];
      }
      return [
        { valor: "no", etiqueta: "No, me encargo yo del contenido", desc: "Escribo o consigo los textos por mi cuenta." },
        { valor: "si", etiqueta: "Sí, necesito redacción", desc: "Indicás cuántas páginas necesitan textos.", cantidad: true }
      ];
    },
    /* Campo numérico condicional: cuántas páginas llevan redacción.
       El tope se valida contra el total de páginas contratadas. */
    inputNumero: {
      paraValor: "si",
      etiqueta: "¿Cuántas páginas necesitan redacción?",
      placeholder: "Ej: 3",
      min: 1,
      ayuda: function (r) {
        var tope = topePaginas(r);
        return tope ? "Podés indicar hasta " + tope + " páginas." : "";
      }
    }
  },

  {
    id: "identidad",
    tipo: "unica",
    cuando: function (r) {
      return r.ecommerce !== "si";
    },
    titulo: "¿Ya tenés identidad visual?",
    sub: "Logo, colores y recursos de marca. Esta respuesta nos ayuda a preparar mejor la propuesta.",
    desdeConfig: "identidades"
  },

  {
    id: "rango_inversion",
    tipo: "unica",
    titulo: "¿Qué rango de inversión tenés en mente?",
    sub: "Sirve para comparar el alcance con tu presupuesto. Nunca modifica el precio del trabajo.",
    /* Se muestra solo si config.rangosInversion tiene valores.
       PENDIENTE: sin rangos definidos, esta pregunta no aparece. */
    cuando: function (r) {
      return r.ecommerce !== "si" && CALC.config.rangosInversion.length > 0;
    },
    opciones: function () {
      return CALC.config.rangosInversion.map(function (r) {
        return { valor: r.valor, etiqueta: r.etiqueta, desc: r.desc || "" };
      });
    }
  },

  {
    id: "contacto",
    tipo: "formulario",
    titulo: "Para prepararte la propuesta",
    sub: "Solo pedimos lo necesario para poder responderte.",
    campos: [
      { id: "nombre", etiqueta: "Tu nombre", tipo: "text", requerido: true, autocomplete: "name" },
      {
        id: "tipo_negocio",
        etiqueta: "Tipo de negocio",
        tipo: "text",
        requerido: true,
        placeholder: "Ej: estudio contable, gimnasio, emprendimiento de joyas",
        autocomplete: "organization"
      },
      {
        id: "descripcion",
        etiqueta: "Descripción del proyecto",
        tipo: "textarea",
        requerido: true,
        placeholder: "Contame qué necesitás, para quién es y qué te gustaría lograr."
      },
      {
        id: "presupuesto_disponible",
        etiqueta: "Presupuesto disponible",
        tipo: "text",
        requerido: false,
        placeholder: "Un monto o rango aproximado que pensás invertir",
        /* Si la pregunta de rangos está configurada, no se pide dos veces. */
        ocultoSiRangos: true
      },
      { id: "email", etiqueta: "Email", tipo: "email", requerido: true, autocomplete: "email" }
    ]
  }
];
