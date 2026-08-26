// Design system: "Acero y Territorio" — an editorial-industrial landing page with direct WhatsApp conversion.
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ClipboardList,
  Hammer,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import {
  DEFAULT_SITE_CONTENT,
  type SiteContentMap,
} from "@shared/siteContent";
import {
  WHATSAPP_CATALOG_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_QUOTE_URL,
} from "@/const";
import { trpc } from "@/lib/trpc";

const ASSETS = {
  hero: "/manus-storage/faro-project-hero_8f711cbb.png",
  shed: "/manus-storage/faro-project-shed_e9262caa.png",
  frame: "/manus-storage/faro-project-frame_d0ca8186.png",
  mark: "/manus-storage/faro-estructuras-original_d7cd9a8c.jpg",
};

const navItems = [
  ["Servicios", "#servicios"],
  ["Proyectos", "#proyectos"],
  ["Sobre nosotros", "#nosotros"],
  ["Contacto", "#contacto"],
];

const services = [
  {
    number: "01",
    title: "Techos residenciales y comerciales",
    description:
      "Instalación, renovación y ampliación de cubiertas en calamina, teja y panel, con solución pensada para cada ambiente.",
    Icon: Hammer,
  },
  {
    number: "02",
    title: "Estructuras metálicas y tinglados",
    description:
      "Fabricación y montaje para galpones, depósitos, talleres y espacios agrícolas que necesitan amplitud y resistencia.",
    Icon: Sparkles,
  },
  {
    number: "03",
    title: "Reparación y mantenimiento",
    description:
      "Atención de filtraciones, cambio de cubierta, refuerzo de estructura y mejoras que prolongan la vida útil de tu obra.",
    Icon: Wrench,
  },
  {
    number: "04",
    title: "Cotización a medida",
    description:
      "Revisamos el alcance de tu proyecto y te orientamos con una solución concreta, ajustada a tu necesidad y presupuesto.",
    Icon: ClipboardList,
  },
];

const projects = [
  {
    category: "Estructura en montaje",
    title: "Armazón de gran luz en montaje",
    description: "Columnas reticuladas, cerchas de gran luz y cubierta metálica en proceso de montaje.",
    imageUrl: ASSETS.frame,
  },
  {
    category: "Galpón agrícola",
    title: "Cubierta para maquinaria",
    description: "Pórticos reticulados, laterales de calamina y altura libre para proteger equipos agrícolas.",
    imageUrl: ASSETS.shed,
  },
  {
    category: "Montaje nocturno",
    title: "Montaje nocturno de cubierta",
    description: "Techo de doble pendiente, vigas reticuladas y apoyos metálicos instalados directamente en obra.",
    imageUrl: ASSETS.hero,
  },
];

function BrandMark() {
  return (
    <a className="brand-mark" href="#inicio" aria-label="Faro Estructuras, inicio">
      <img src={ASSETS.mark} alt="Faro Estructuras — Ingeniería y Fabricación" />
    </a>
  );
}

function CatalogLink({
  children,
  className = "",
  label,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
  href?: string;
}) {
  return (
    <a
      className={className}
      href={href ?? WHATSAPP_CATALOG_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={label || "Abrir el catálogo de WhatsApp de Franz Wieler"}
    >
      {children}
    </a>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const managedSite = trpc.site.public.useQuery();
  const content: SiteContentMap = managedSite.data?.content ?? DEFAULT_SITE_CONTENT;
  const galleryProjects = managedSite.data?.projects ?? projects;
  const whatsappNumber = (content.whatsappNumber || WHATSAPP_NUMBER).replace(/\D/g, "");
  const catalogUrl = `https://wa.me/c/${whatsappNumber}`;
  const quoteMessage = "Hola Franz, me gustaría solicitar una cotización para un trabajo de techos.";
  const quoteUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(quoteMessage)}`;
  const telephoneUrl = `tel:+${whatsappNumber}`;

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("resize", closeMenu);
    return () => window.removeEventListener("resize", closeMenu);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = [
      "Hola Franz, me gustaría solicitar una cotización.",
      "",
      `Nombre: ${form.get("nombre")}`,
      `Teléfono: ${form.get("telefono")}`,
      `Zona/ubicación: ${form.get("ubicacion")}`,
      `Proyecto: ${form.get("proyecto")}`,
    ].join("\n");
    setSubmitted(true);
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="site-shell" id="inicio">
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>

      <header className="site-header">
        <div className="header-line" />
        <div className="header-inner">
          <BrandMark />
          <nav className="desktop-nav" aria-label="Navegación principal">
            {navItems.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
            <a className="client-access-nav" href="/admin" aria-label="Acceso cliente al portal de administración">
              Acceso cliente <ArrowUpRight size={14} strokeWidth={2.2} />
            </a>
          </nav>
          <div className="header-actions">
            <CatalogLink className="catalog-header-link" href={catalogUrl}>
              Ver catálogo <ArrowUpRight size={15} strokeWidth={2.2} />
            </CatalogLink>
            <a className="quote-header-link" href={quoteUrl} target="_blank" rel="noreferrer">
              Pedir cotización <ArrowUpRight size={15} strokeWidth={2.2} />
            </a>
            <button
              className="menu-toggle"
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
        <nav
          className={`mobile-nav ${menuOpen ? "mobile-nav-open" : ""}`}
          id="mobile-navigation"
          aria-label="Navegación móvil"
        >
          {navItems.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <a className="mobile-client-access" href="/admin" onClick={() => setMenuOpen(false)}>
            Acceso cliente <ArrowUpRight size={17} />
          </a>
          <CatalogLink className="mobile-catalog" href={catalogUrl} label="Abrir catálogo de WhatsApp">
            Ver catálogo por WhatsApp <ArrowUpRight size={17} />
          </CatalogLink>
        </nav>
      </header>

      <main id="contenido">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-technical-mark hero-technical-mark-left" aria-hidden="true">
            <span>00</span>
            <i />
            <span>PAILÓN · SCZ</span>
          </div>
          <div className="hero-copy-wrap">
            <p className="eyebrow eyebrow-light">
              <span /> {content.heroBadge}
            </p>
            <h1 id="hero-title">
              {content.heroTitle}
              <br />
              <em>{content.heroHighlight}</em>
            </h1>
            <p className="hero-description">
              {content.heroDescription}
            </p>
            <div className="hero-actions">
              <a className="button button-safety" href={quoteUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={18} />
                Pedir cotización
                <ArrowUpRight size={17} />
              </a>
              <CatalogLink className="button button-outline-light" href={catalogUrl}>
                Ver catálogo de trabajos <ArrowUpRight size={17} />
              </CatalogLink>
            </div>
            <div className="hero-contact-rail">
              <span>ATENCIÓN DIRECTA</span>
              <a href={telephoneUrl}>{content.phoneNumber}</a>
            </div>
          </div>
          <div className="hero-image-wrap">
            <img
              className="hero-image"
              src={ASSETS.hero}
              alt="Tinglado metálico de gran luz durante un montaje nocturno"
            />
            <div className="hero-image-grid" aria-hidden="true" />
            <div className="hero-image-note">
              <span>OBRA RESIDENCIAL · AGRÍCOLA · COMERCIAL</span>
              <ArrowDownRight size={18} />
            </div>
          </div>
          <a className="hero-scroll-cue" href="#servicios" aria-label="Ver servicios">
            <span>DESCUBRÍ EL OFICIO</span>
            <ChevronDown size={18} />
          </a>
        </section>

        <section className="intro-section" id="nosotros" aria-labelledby="intro-title">
          <div className="intro-photo-card">
            <img src={ASSETS.shed} alt="Galpón agrícola terminado para proteger maquinaria" />
            <div className="photo-corner-label">ESTRUCTURA · 02</div>
          </div>
          <div className="intro-copy">
            <p className="eyebrow"><span /> SOBRE EL TRABAJO</p>
            <h2 id="intro-title">
              {content.aboutTitle}
            </h2>
            <p>
              {content.aboutBody}
            </p>
            <div className="experience-note" aria-label="Tres años de experiencia">
              <strong>3</strong>
              <p><span>AÑOS DE EXPERIENCIA</span>{content.experienceText}</p>
            </div>
            <div className="intro-details">
              <div>
                <span className="detail-number">01</span>
                <strong>Atención directa</strong>
                <p>Una conversación clara desde la primera consulta.</p>
              </div>
              <div>
                <span className="detail-number">02</span>
                <strong>Solución a medida</strong>
                <p>Obra pensada para tu terreno, actividad y presupuesto.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="services-section" id="servicios" aria-labelledby="services-title">
          <div className="section-heading section-heading-dark">
            <div>
              <p className="eyebrow eyebrow-light"><span /> SERVICIOS</p>
              <h2 id="services-title">
                Estructura para
                <br />
                <em>cada proyecto.</em>
              </h2>
            </div>
            <p className="heading-aside">
              Desde una reparación puntual hasta el montaje de un tinglado completo, encontrá una solución clara para
              el trabajo que necesitás hacer.
            </p>
          </div>
          <div className="services-grid">
            {services.map(({ number, title, description, Icon }) => (
              <article className="service-card" key={number}>
                <div className="service-card-top">
                  <span>{number}</span>
                  <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <CatalogLink className="text-link" href={catalogUrl} label={`Ver catálogo para ${title}`}>
                  Ver catálogo <ArrowUpRight size={16} />
                </CatalogLink>
              </article>
            ))}
          </div>
          <div className="service-baseline">
            <span>TECHOS</span><i /><span>TINGLADOS</span><i /><span>ESTRUCTURAS</span><i /><span>MANTENIMIENTO</span>
          </div>
        </section>

        <section className="proof-section" aria-labelledby="proof-title">
          <div className="proof-heading">
            <p className="eyebrow"><span /> POR QUÉ ELEGIRNOS</p>
            <h2 id="proof-title">Un trabajo firme empieza por decisiones claras.</h2>
          </div>
          <div className="proof-list">
            <article>
              <span className="proof-index">A</span>
              <div>
                <h3>Calidad y resistencia</h3>
                <p>Materiales y soluciones que responden al sol, la lluvia y el uso diario de Santa Cruz.</p>
              </div>
              <ShieldCheck size={29} strokeWidth={1.5} aria-hidden="true" />
            </article>
            <article>
              <span className="proof-index">B</span>
              <div>
                <h3>Puntualidad y garantía</h3>
                <p>Compromiso con las fechas acordadas y una ejecución cuidada en cada etapa de obra.</p>
              </div>
              <Check size={29} strokeWidth={1.5} aria-hidden="true" />
            </article>
            <article>
              <span className="proof-index">C</span>
              <div>
                <h3>Atención directa</h3>
                <p>Coordinación sencilla con Franz, sin pasos innecesarios entre la consulta y la solución.</p>
              </div>
              <MessageCircle size={29} strokeWidth={1.5} aria-hidden="true" />
            </article>
          </div>
        </section>

        <section className="projects-section" id="proyectos" aria-labelledby="projects-title">
          <div className="projects-heading">
            <div>
              <p className="eyebrow"><span /> GALERÍA DE TRABAJOS</p>
              <h2 id="projects-title">
                El oficio se ve
                <br />
                en los <em>detalles.</em>
              </h2>
            </div>
            <CatalogLink className="button button-dark" href={catalogUrl}>
              Ver catálogo en WhatsApp <ArrowUpRight size={17} />
            </CatalogLink>
          </div>
          <div className="project-grid">
            {galleryProjects.map(({ category, title, description, imageUrl }, index) => (
              <CatalogLink className={`project-card project-card-${index + 1}`} key={title} label={`Abrir catálogo: ${title}`}>
                <img src={imageUrl} alt={title} />
                <div className="project-overlay" />
                <div className="project-meta">
                  <span>{category}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span className="project-open"><ArrowUpRight size={20} /></span>
              </CatalogLink>
            ))}
          </div>
          <p className="gallery-note">Las imágenes muestran tipos de trabajo y referencias visuales. Pedí el catálogo para ver más opciones.</p>
        </section>

        <section className="coverage-section" aria-label="Cobertura de servicio">
          <div className="coverage-map-art" aria-hidden="true">
            <span className="map-line map-line-a" />
            <span className="map-line map-line-b" />
            <span className="map-line map-line-c" />
            <span className="map-point map-point-main" />
            <span className="map-point map-point-small" />
            <span className="map-coord coord-a">17° 39′ S</span>
            <span className="map-coord coord-b">62° 42′ O</span>
          </div>
          <div className="coverage-copy">
            <p className="eyebrow eyebrow-light"><span /> ZONA DE TRABAJO</p>
            <h2>{content.coverageTitle}</h2>
            <p>{content.coverageBody}</p>
            <div className="coverage-location"><MapPin size={18} /> {content.location.toUpperCase()}</div>
          </div>
        </section>

        <section className="contact-section" id="contacto" aria-labelledby="contact-title">
          <div className="contact-intro">
            <p className="eyebrow"><span /> CONTACTO</p>
            <h2 id="contact-title">
              {content.contactTitle}
            </h2>
            <p>{content.contactBody}</p>
            <div className="contact-details">
              <a href={telephoneUrl}><Phone size={17} /> {content.phoneNumber}</a>
              <a href={quoteUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Escribir por WhatsApp</a>
            </div>
          </div>
          <form className="quote-form" onSubmit={handleSubmit}>
            <div className="form-topline"><span>COTIZACIÓN DIRECTA</span><span>01 / 01</span></div>
            <label>
              Tu nombre
              <input name="nombre" required placeholder="Ej. María López" autoComplete="name" />
            </label>
            <div className="form-row">
              <label>
                Teléfono
                <input name="telefono" required type="tel" placeholder="Ej. 7XX XXX XX" autoComplete="tel" />
              </label>
              <label>
                Zona / ubicación
                <input name="ubicacion" required placeholder="Ej. Pailón" />
              </label>
            </div>
            <label>
              Detalles del proyecto
              <textarea name="proyecto" required rows={4} placeholder="Contanos qué necesitás: tipo de techo, medidas aproximadas, reparación o estructura…" />
            </label>
            <button className="button button-safety form-submit" type="submit">
              <MessageCircle size={18} /> Enviar consulta por WhatsApp <ArrowUpRight size={17} />
            </button>
            {submitted && <p className="form-confirmation">Se abrió WhatsApp con los datos de tu consulta.</p>}
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <BrandMark />
          <p>{content.footerDescription}</p>
          <CatalogLink className="footer-catalog" href={catalogUrl}>Ver catálogo <ArrowUpRight size={16} /></CatalogLink>
        </div>
        <div className="footer-links">
          <div><span>RECORRIDO</span>{navItems.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</div>
          <div><span>CONTACTO</span><a href={telephoneUrl}>{content.phoneNumber}</a><a href={quoteUrl} target="_blank" rel="noreferrer">WhatsApp directo</a><p>{content.location}</p></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} FRANZ WIELER</span><span>CONSTRUCCIÓN DE TECHOS Y ESTRUCTURAS</span><a href="/admin" aria-label="Acceso para administrar el sitio">ACCESO CLIENTE</a></div>
      </footer>

      <CatalogLink className="floating-catalog" href={catalogUrl} label="Abrir catálogo de WhatsApp de Faro Estructuras">
        <MessageCircle size={20} />
        <span>Catálogo</span>
      </CatalogLink>
    </div>
  );
}
