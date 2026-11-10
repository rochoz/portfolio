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
                  se lista como "pendiente de cotización" sin bloquear
                  el subtotal de los conceptos tarifados
     "manual"   → sin tarifa definida: se maneja como pendiente de
                  cotización o como derivación completa a cotización
                  manual, según la regla comercial del concepto
                  (ver engine.js)

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
    emailjs: { publicKey: "H9LPq3lz3m58sunYf", serviceId: "service_santiagogimenezw", templateId: "template_60n250z" }
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
      /* Secciones de contenido (header y footer no cuentan como secciones).
         Hasta N incluidas → precio base; de N+1 a M → suma fija.
         Cantidad sin definir → estimación parcial, sin importe adicional. */
      seccionesIncluidas: 5,
      seccionesRangoHasta: 10,
      seccionesAdicional: 40000,
      incluye: [
        "Diseño responsive personalizado",
        "Redacción comercial básica de textos",
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
        "Redacción comercial básica de textos",
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
        "Redacción comercial básica de textos",
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
      pricing: 30000
    },
    {
      id: "loader",
      nombre: "Carga inicial de contenido",
      descripcion: "Una pantalla de bienvenida mientras se carga el sitio.",
      pricing: 10000
    },
    /* Adicionales 2026-10 (revisados) — importes definidos por el propietario,
       provisionalmente fijos; cambiálos únicamente acá (nunca duplicar). */
    {
      id: "turnos",
      nombre: "Reservas online con Calendly",
      descripcion: "Reservas online con Calendly, integrado en tu sitio web y conectado con Google Calendar para gestionar la disponibilidad.",
      nota: "Integro el widget de Calendly con un tipo de turno (horarios y duración) y lo conecto con tu Google Calendar según tu plan. Las cuentas de Calendly y Google son tuyas; un plan pago va por tu cuenta. Varios profesionales, cobros online o un sistema propio: se cotiza aparte.",
      pricing: 50000
    },
    {
      id: "galeria",
      nombre: "Galería de imágenes",
      descripcion: "Galería interactiva y adaptada al diseño del sitio, con hasta 8 imágenes que nos proporcionás vos.",
      nota: "Podés ampliar cada imagen y volver a la galería, con navegación y cierre por teclado y optimización de las imágenes para el rendimiento. Sin panel de administración ni carga dinámica de archivos.",
      pricing: 25000
    },
    {
      id: "testimonios",
      nombre: "Reseñas de Google Maps",
      descripcion: "Sección con reseñas reales publicadas en Google sobre tu negocio: autor, texto y valoración cuando esté disponible, con enlace para verlas en Google.",
      nota: "Mostramos lo que Google provee, sin reseñas inventadas. La integración depende de la API de Google Maps Platform y del perfil de tu negocio, con costo por uso a tu facturación: por eso se cotiza aparte.",
      pricing: "manual"
    },
    {
      id: "idioma_extra",
      nombre: "Sitio en dos idiomas (español e inglés)",
      descripcion: "Español como idioma principal e inglés como segundo, con selector de idioma visible y adaptación de las páginas incluidas en el presupuesto y de los elementos de la interfaz.",
      nota: "Los textos traducidos los proporcionás vos. Incluye atributo de idioma del documento, URLs diferenciadas si la arquitectura lo requiere y SEO básico por versión. Más de dos idiomas, o más páginas que las del alcance estándar: se cotiza aparte.",
      pricing: 50000
    },
    {
      id: "integraciones",
      nombre: "Integraciones externas",
      descripcion: "Conectar el sitio con una herramienta o servicio de terceros.",
      pricing: 40000,
      requiereDescripcion: true
    },
    {
      id: "a_medida",
      nombre: "Una función especial a medida",
      descripcion: "Algo específico que no entra en las opciones anteriores. Se evalúa caso por caso.",
      pricing: "manual"
    }
  ],

  /* Contenidos: solo organización del trabajo. La redacción comercial
     básica ya está incluida en el precio base de los tres paquetes;
     no existe adicional de preparación de contenido (no inventar tarifas). */
  contenidos: [
    { id: "tenido", nombre: "Ya tengo textos e imágenes", descripcion: "Recibo el contenido listo para usar." },
    { id: "parcial", nombre: "Tengo parte del contenido preparado", descripcion: "Algo está listo y falta completar el resto." }
  ],

  /* Branding: la creación o mejora de logo e identidad visual no
     tiene tarifa definida → se lista como pendiente de cotización
     sin bloquear el subtotal (regla en engine.js). */
  identidades: [
    {
      id: "completa",
      nombre: "Sí, ya tengo logo e identidad visual",
      descripcion: "Logo, colores y recursos listos para usar en el sitio."
    },
    {
      id: "parcial",
      nombre: "Tengo logo, pero necesito mejorar mi identidad visual",
      descripcion: "Partimos de tu logo; el resto de la identidad se desarrolla aparte."
    },
    {
      id: "ninguna",
      nombre: "No tengo logo ni identidad visual",
      descripcion: "Se desarrolla logo e identidad desde cero."
    },
    {
      id: "inseguro",
      nombre: "Todavía no estoy seguro",
      descripcion: "Lo definimos en la conversación.",
      observacion: "Todavía no definiste tu branding: si necesitás crear el logo o la identidad, se cotiza aparte."
    }
  ],

  mantenimiento: {
    nombre: "Mantenimiento web",
    precioMensual: 35000,
    periodicidad: "mes",
    estado: "Servicio mensual independiente del desarrollo",
    sumaAlTotal: false
  }
};
