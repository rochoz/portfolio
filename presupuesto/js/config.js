/* =============================================================
   Calculadora de presupuestos — configuración comercial
   -------------------------------------------------------------
   ÚNICA FUENTE DE TARIFAS DEL PROYECTO.
   No duplicar importes en otros archivos ni en los componentes
   visuales: todo precio que se muestre sale de acá.

   Estados de tarifa (pricing):
     "incluida" → sin costo adicional (regla comercial definida)
     número     → importe fijo en ARS (regla comercial definida)
     "pendiente"→ sin tarifa definida: NO genera importe automático;
                  marca el resultado como "pendiente de cotización"
     "manual"   → se deriva a cotización personalizada

   Campos PENDIENTES (no inventar valores):
     - rangosInversion      → []    vacío: la pregunta de inversión
                                    no se muestra hasta configurarla
     - margenIncertidumbre  → null  sin rango numérico en el resultado
   ============================================================= */

var CALC = CALC || {};

CALC.config = {
  moneda: { prefijo: "AR$", locale: "es-AR" },

  vigenciaDias: 15,

  contacto: {
    /* Número ya activo en todo el portfolio (wa.me). */
    whatsapp: "543765115836",
    /* EmailJS: completar con credenciales reales.
       Mientras estén vacías, el botón de email queda deshabilitado. */
    emailjs: { publicKey: "", serviceId: "", templateId: "" }
  },

  /* PENDIENTE: rangos de inversión del cliente (pregunta 7).
     Formato cuando se defina: [{ valor, etiqueta, min, max }] */
  rangosInversion: [],

  /* PENDIENTE: política de incertidumbre de la estimación (por ejemplo
     0.1 = ±10%). null = no se muestra ningún rango numérico. */
  margenIncertidumbre: null,

  proyectos: {
    landing: {
      nombre: "Landing page",
      precioBase: 200000,
      /* La landing tiene tarifa plana: las secciones no modifican
         el precio (sin regla comercial de secciones adicionales). */
      incluye: [
        "Diseño responsive personalizado",
        "Integración con WhatsApp",
        "SEO técnico básico",
        "Formulario de contacto",
        "2 rondas de revisiones"
      ]
    },
    institucional: {
      nombre: "Sitio institucional",
      precioBase: 350000,
      paginasIncluidas: 4,
      precioPaginaAdicional: 40000,
      incluye: [
        "Diseño responsive personalizado",
        "Integración con WhatsApp",
        "SEO técnico básico",
        "2 rondas de revisiones"
      ]
    },
    catalogo: {
      nombre: "Catálogo de productos",
      precioBase: 320000,
      productosIncluidos: 10,
      incluye: [
        "Diseño responsive personalizado",
        "Integración con WhatsApp",
        "SEO técnico básico",
        "2 rondas de revisiones"
      ]
    }
  },

  disenos: [
    {
      id: "estandar",
      nombre: "Diseño profesional estándar",
      descripcion: "Una propuesta visual clara y profesional adaptada a tu marca.",
      pricing: "incluida"
    },
    {
      id: "personalizado",
      nombre: "Diseño personalizado",
      descripcion: "Una propuesta hecha especialmente para tu negocio y tu identidad.",
      pricing: "incluida"
    },
    {
      id: "avanzado",
      nombre: "Animaciones y detalles visuales avanzados",
      descripcion: "Efectos y transiciones especiales para destacar.",
      pricing: "pendiente",
      nota: "Su alcance se evalúa en la conversación."
    }
  ],

  funcionalidades: [
    {
      id: "formulario",
      nombre: "Formulario de contacto",
      descripcion: "Un formulario para que te escriban desde el sitio.",
      pricing: { landing: "incluida", institucional: "incluida", catalogo: "pendiente" }
    },
    {
      id: "modo_oscuro",
      nombre: "Modo claro y oscuro",
      descripcion: "Que la persona pueda cambiar entre fondo claro y oscuro.",
      pricing: 20000
    },
    {
      id: "animaciones",
      nombre: "Animaciones avanzadas",
      descripcion: "Efectos visuales al entrar o al navegar por el sitio.",
      pricing: "pendiente"
    },
    {
      id: "loader",
      nombre: "Carga inicial de contenido",
      descripcion: "Una pantalla de bienvenida mientras se carga el sitio.",
      pricing: 10000
    },
    {
      id: "redaccion",
      nombre: "Redacción de textos",
      descripcion: "Escribo los textos del sitio a partir de tu información.",
      pricing: "pendiente"
    },
    {
      id: "integraciones",
      nombre: "Integraciones externas",
      descripcion: "Conectar el sitio con una herramienta o servicio de terceros.",
      pricing: "pendiente",
      requiereDescripcion: true
    },
    {
      id: "a_medida",
      nombre: "Una función especial a medida",
      descripcion: "Algo específico que no entra en las opciones anteriores. Se evalúa caso por caso.",
      pricing: "manual"
    }
  ],

  contenidos: [
    { id: "tenido", nombre: "Ya tengo textos e imágenes", descripcion: "Recibo el contenido listo para usar." },
    { id: "parcial", nombre: "Tengo parte del contenido preparado", descripcion: "Algo está listo y falta completar el resto." },
    {
      id: "desde_cero",
      nombre: "Necesito que se prepare todo desde cero",
      descripcion: "Los textos e imágenes se producen durante el proyecto.",
      pricing: "pendiente"
    }
  ],

  identidades: [
    { id: "completa", nombre: "Sí, tengo logo, colores y recursos de marca" },
    { id: "parcial", nombre: "Tengo algunas cosas, pero no todo" },
    {
      id: "ninguna",
      nombre: "No tengo nada definido todavía",
      observacion: "No tiene identidad visual definida: conviene conversarlo antes de arrancar."
    }
  ],

  mantenimiento: {
    nombre: "Mantenimiento web",
    precioMensual: 35000,
    periodicidad: "mes",
    estado: "Servicio mensual independiente del desarrollo",
    sumaAlTotal: false
  },

  reglas: {
    /* Evita el doble cobro: si el contenido se prepara desde cero y a la
       vez se pide redacción, se consideran una sola vez. */
    redaccionCubiertaSiContenidoDesdeCero: true
  }
};
