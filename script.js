const navbar = document.querySelector(".navbar");
const menuToggle = document.querySelector(".menu-toggle");
const primaryMenu = document.querySelector("#primary-menu");

document.documentElement.classList.add("js");

if (navbar && menuToggle && primaryMenu) {
  const setMenuOpen = (isOpen) => {
    navbar.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación",
    );
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  primaryMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!navbar.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) setMenuOpen(false);
  });
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealSelectors = [
  "#como-trabajo .process-heading",
  "#como-trabajo .process-step",
  "#servicios .services-heading",
  "#servicios .service-feature",
  "#servicios .service-row",
  "#servicios .services-terms",
  "#proyectos > h2",
  "#proyectos .project-card",
  "#preguntas-frecuentes .faq-heading",
  "#preguntas-frecuentes .faq-item",
  "#preguntas-frecuentes .faq-cta",
  "#contacto > h2",
  "#contacto .contact-text",
  "#contacto .cardContacto",
].join(",");

if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
  const revealTargets = document.querySelectorAll(revealSelectors);
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0,
      rootMargin: window.matchMedia("(max-width: 768px)").matches
        ? "0px 0px -10% 0px"
        : "0px 0px 14% 0px",
    },
  );

  document.documentElement.classList.add("motion-ready");
  revealTargets.forEach((target) => {
    target.classList.add("scroll-reveal");
    revealObserver.observe(target);
  });
}
