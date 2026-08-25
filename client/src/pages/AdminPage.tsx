// Client-only editor: drafts are persisted separately and require an explicit publish action.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Eye,
  FileImage,
  ImagePlus,
  LayoutDashboard,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Save,
  Send,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type ContentState = Record<string, string>;
type ProjectDraft = {
  id?: number;
  category: string;
  title: string;
  description: string;
  altText: string;
  imageUrl: string;
  imageKey?: string | null;
  visible: boolean;
  sortOrder: number;
};

const textFields = [
  { key: "heroTitle", label: "Titular principal", multiline: false },
  { key: "heroHighlight", label: "Palabra destacada del titular", multiline: false },
  { key: "heroDescription", label: "Descripción principal", multiline: true },
  { key: "aboutTitle", label: "Título de presentación", multiline: false },
  { key: "aboutBody", label: "Texto de presentación", multiline: true },
  { key: "experienceText", label: "Texto de experiencia", multiline: true },
  { key: "coverageTitle", label: "Título de zona de trabajo", multiline: false },
  { key: "coverageBody", label: "Texto de zona de trabajo", multiline: true },
  { key: "contactTitle", label: "Título de contacto", multiline: false },
  { key: "contactBody", label: "Texto de contacto", multiline: true },
  { key: "footerDescription", label: "Descripción del pie de página", multiline: true },
] as const;

const businessFields = [
  { key: "phoneNumber", label: "Teléfono visible", placeholder: "+591 635 44951" },
  { key: "whatsappNumber", label: "Número de WhatsApp (solo números)", placeholder: "59163544951" },
  { key: "location", label: "Ubicación", placeholder: "Pailón, Santa Cruz, Bolivia" },
] as const;

const blankProject = (sortOrder: number): ProjectDraft => ({
  category: "Nuevo proyecto",
  title: "Título del proyecto",
  description: "Describí la estructura, la cubierta y los detalles principales de este trabajo.",
  altText: "Proyecto de Faro Estructuras",
  imageUrl: "",
  imageKey: null,
  visible: true,
  sortOrder,
});

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });
}

function ClientPortalShell({ children, email, onLogout }: { children: React.ReactNode; email: string; onLogout: () => void }) {
  const [location, setLocation] = useLocation();
  const items = [
    { label: "Resumen", path: "/admin", Icon: LayoutDashboard },
    { label: "Proyectos", path: "/admin/proyectos", Icon: ImagePlus },
    { label: "Vista previa", path: "/admin/vista-previa", Icon: Eye },
  ];
  return <div className="min-h-screen bg-[#f7f3ea] text-slate-950"><header className="sticky top-0 z-30 border-b border-slate-200 bg-[#f7f3ea]/95 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3"><a href="/" className="text-sm font-black tracking-tight">FARO <span className="text-orange-600">ESTRUCTURAS</span></a><nav className="flex flex-wrap items-center gap-1" aria-label="Navegación del portal">{items.map(item => <Button key={item.path} variant={location === item.path ? "default" : "ghost"} size="sm" className={location === item.path ? "bg-slate-950 hover:bg-slate-800" : ""} onClick={() => setLocation(item.path)}><item.Icon className="mr-1.5 h-4 w-4" />{item.label}</Button>)}</nav><div className="flex items-center gap-2"><span className="hidden max-w-44 truncate text-xs text-slate-500 sm:block">{email}</span><Button variant="outline" size="sm" onClick={onLogout}><LogOut className="mr-1.5 h-4 w-4" />Salir</Button></div></div></header><main className="px-4 py-6">{children}</main></div>;
}

function RecoveryRequest({ onBack }: { onBack: () => void }) {
  const requestReset = trpc.clientAuth.requestPasswordReset.useMutation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await requestReset.mutateAsync({ email });
    setSent(true);
  };
  return <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-white/15 bg-white/5 p-8"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange-500/15 text-orange-300"><KeyRound /></span><div><h1 className="text-2xl font-semibold">Recuperar contraseña</h1><p className="mt-2 text-sm leading-6 text-slate-300">Ingresá el correo de acceso. Si coincide con la cuenta, recibirás un enlace válido por 60 minutos.</p></div>{sent ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">Si el correo corresponde a una cuenta, enviamos las instrucciones para restablecer la contraseña.</p> : <label className="grid gap-2 text-left text-sm font-medium">Correo electrónico<Input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="bg-white text-slate-950" /></label>}{!sent && <Button type="submit" disabled={requestReset.isPending} className="w-full bg-orange-500 hover:bg-orange-600">{requestReset.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Enviar enlace</Button>}<Button type="button" variant="ghost" onClick={onBack} className="w-full text-slate-200 hover:bg-white/10 hover:text-white">Volver al inicio de sesión</Button></form></div>;
}

function PasswordReset({ token, onBack }: { token: string; onBack: () => void }) {
  const resetPassword = trpc.clientAuth.resetPassword.useMutation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!token) { setError("El enlace no es válido. Solicitá uno nuevo."); return; }
    if (password.length < 12) { setError("La nueva contraseña debe tener al menos 12 caracteres."); return; }
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    try { await resetPassword.mutateAsync({ token, password }); setSuccess(true); setPassword(""); setConfirmation(""); }
    catch (mutationError: any) { setError(mutationError.message || "No se pudo restablecer la contraseña."); }
  };
  return <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-white/15 bg-white/5 p-8"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange-500/15 text-orange-300"><KeyRound /></span><div><h1 className="text-2xl font-semibold">Nueva contraseña</h1><p className="mt-2 text-sm leading-6 text-slate-300">Elegí una contraseña nueva de al menos 12 caracteres para el portal de Faro Estructuras.</p></div>{success ? <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">Contraseña actualizada. Ya podés iniciar sesión.</p> : <><label className="grid gap-2 text-left text-sm font-medium">Nueva contraseña<Input required type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="bg-white text-slate-950" /></label><label className="grid gap-2 text-left text-sm font-medium">Confirmar nueva contraseña<Input required type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="bg-white text-slate-950" /></label>{error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}<Button type="submit" disabled={resetPassword.isPending} className="w-full bg-orange-500 hover:bg-orange-600">{resetPassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Restablecer contraseña</Button></>}<Button type="button" variant="ghost" onClick={onBack} className="w-full text-slate-200 hover:bg-white/10 hover:text-white">Ir al inicio de sesión</Button></form></div>;
}

function ClientPortalGate({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const auth = trpc.clientAuth.me.useQuery();
  const login = trpc.clientAuth.login.useMutation({ onSuccess: () => utils.clientAuth.me.invalidate() });
  const logout = trpc.clientAuth.logout.useMutation({ onSuccess: () => { utils.clientAuth.me.invalidate(); } });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  if (location === "/admin/restablecer") {
    const token = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || "";
    return <PasswordReset token={token} onBack={() => setLocation("/admin")} />;
  }

  if (auth.isLoading) return <div className="grid min-h-screen place-items-center bg-slate-950"><Loader2 className="animate-spin text-orange-400" /></div>;
  if (!auth.data?.authenticated) {
    if (showRecovery) return <RecoveryRequest onBack={() => setShowRecovery(false)} />;
    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError("");
      try { await login.mutateAsync({ email, password }); setPassword(""); }
      catch { setError("Correo o contraseña incorrectos. Intentá nuevamente."); }
    };
    return <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-white"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-white/15 bg-white/5 p-8"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange-500/15 text-orange-300"><ShieldAlert /></span><div><h1 className="text-2xl font-semibold">Acceso cliente</h1><p className="mt-2 text-sm leading-6 text-slate-300">Ingresá con el correo y la contraseña entregados para administrar el sitio de Faro Estructuras.</p></div><label className="grid gap-2 text-left text-sm font-medium">Correo electrónico<Input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="bg-white text-slate-950" /></label><label className="grid gap-2 text-left text-sm font-medium">Contraseña<Input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="bg-white text-slate-950" /></label>{error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}<Button type="submit" disabled={login.isPending} className="w-full bg-orange-500 hover:bg-orange-600">{login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Iniciar sesión</Button><a href="/" className="block text-sm text-slate-300 underline underline-offset-4">Volver al sitio público</a></form></div>;
  }
  return <ClientPortalShell email={auth.data.email || ""} onLogout={() => logout.mutate()}>{children}</ClientPortalShell>;
}

function ContentEditor({ content, onChange }: { content: ContentState; onChange: (key: string, value: string) => void }) {
  return <div className="grid gap-4 lg:grid-cols-2">{textFields.map(field => <label key={field.key} className={`grid gap-2 rounded-xl border border-slate-200 bg-white p-4 ${field.multiline ? "lg:col-span-2" : ""}`}><span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{field.label}</span>{field.multiline ? <Textarea value={content[field.key] ?? ""} onChange={event => onChange(field.key, event.target.value)} rows={3} /> : <Input value={content[field.key] ?? ""} onChange={event => onChange(field.key, event.target.value)} />}</label>)}</div>;
}

function ProjectEditor({ projects, setProjects }: { projects: ProjectDraft[]; setProjects: (projects: ProjectDraft[]) => void }) {
  const uploadImage = trpc.site.admin.uploadImage.useMutation();
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [imageMessages, setImageMessages] = useState<Record<number, string>>({});
  const [newProjectIndex, setNewProjectIndex] = useState<number | null>(null);
  useEffect(() => {
    if (newProjectIndex === null) return;
    let nestedFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      nestedFrame = window.requestAnimationFrame(() => {
        const card = document.getElementById(`project-card-${newProjectIndex}`);
        const titleInput = card?.querySelector<HTMLInputElement>('input[aria-label="Título"]');
        if (!titleInput) return;
        const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
        const targetTop = titleInput.getBoundingClientRect().top + window.scrollY - headerHeight - 24;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
        window.requestAnimationFrame(() => titleInput.focus({ preventScroll: true }));
        setNewProjectIndex(null);
      });
    });
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(nestedFrame); };
  }, [newProjectIndex, projects.length]);
  const updateProject = (index: number, patch: Partial<ProjectDraft>) => setProjects(projects.map((project, current) => current === index ? { ...project, ...patch } : project));
  const uploadProjectImage = async (index: number, file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) { setImageMessages(current => ({ ...current, [index]: "Usá JPG, PNG o WEBP de hasta 8 MB." })); return; }
    setBusyIndex(index);
    try {
      const uploaded = await uploadImage.mutateAsync({ fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64: await readFileAsBase64(file) });
      updateProject(index, { imageUrl: uploaded.url, imageKey: uploaded.key });
      setImageMessages(current => ({ ...current, [index]: `“${file.name}” se guardó en Firebase. Guardá el borrador para incluirla en la vista previa.` }));
    } catch { setImageMessages(current => ({ ...current, [index]: "No se pudo subir la imagen. Probá nuevamente." })); }
    finally { setBusyIndex(null); }
  };
  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= projects.length) return;
    const reordered = [...projects]; [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    setProjects(reordered.map((project, sortOrder) => ({ ...project, sortOrder })));
  };
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-sm leading-6 text-slate-600">Las fotos y textos se guardan primero como borrador. Revisalos en la vista previa antes de publicarlos.</p><Button type="button" onClick={() => { const index = projects.length; setProjects([...projects, blankProject(index)]); setNewProjectIndex(index); toast.success("Proyecto agregado", { description: "Te llevamos al nuevo proyecto. Completá los datos y subí una imagen antes de publicarlo." }); }}><Plus className="mr-2 h-4 w-4" />Agregar proyecto</Button></div>{projects.map((project, index) => <article id={`project-card-${index}`} tabIndex={-1} key={project.id ?? `new-${index}`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="grid gap-0 lg:grid-cols-[280px_1fr]"><div className="relative min-h-56 bg-slate-100" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); uploadProjectImage(index, event.dataTransfer.files?.[0]); }}>{project.imageUrl ? <img className="absolute inset-0 h-full w-full object-cover" src={project.imageUrl} alt={project.altText || project.title} /> : <div className="absolute inset-0 grid place-items-center text-slate-400"><FileImage /></div>}<label className="absolute inset-x-3 bottom-3 grid cursor-pointer gap-1 rounded-xl border border-white/30 bg-slate-950/95 p-3 text-white shadow-lg backdrop-blur-sm transition hover:bg-slate-900"><span className="flex items-center gap-2 text-sm font-bold"><ImagePlus className="h-4 w-4 text-orange-300" />{busyIndex === index ? "Subiendo foto…" : "Subir o reemplazar foto"}</span><span className="text-xs text-slate-300">Arrastrá una imagen aquí o hacé clic. JPG, PNG o WEBP · máximo 8 MB.</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busyIndex === index} onChange={event => uploadProjectImage(index, event.target.files?.[0])} /></label></div><div className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Proyecto {String(index + 1).padStart(2, "0")}</span><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={project.visible} onChange={event => updateProject(index, { visible: event.target.checked })} /> Visible al publicar</label></div><div className={`rounded-lg border px-3 py-2 text-sm leading-5 ${imageMessages[index]?.startsWith("No se pudo") || imageMessages[index]?.startsWith("Usá") ? "border-red-200 bg-red-50 text-red-700" : imageMessages[index] ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{imageMessages[index] || "Paso 1: subí una foto nueva. Paso 2: guardá el borrador. Paso 3: revisá y publicá."}</div><div className="grid gap-3 md:grid-cols-2"><Input aria-label="Categoría" value={project.category} onChange={event => updateProject(index, { category: event.target.value })} placeholder="Categoría" /><Input aria-label="Título" value={project.title} onChange={event => updateProject(index, { title: event.target.value })} placeholder="Título" /></div><Textarea aria-label="Descripción estructural" rows={3} value={project.description} onChange={event => updateProject(index, { description: event.target.value })} placeholder="Descripción estructural" /><Input aria-label="Texto alternativo" value={project.altText} onChange={event => updateProject(index, { altText: event.target.value })} placeholder="Descripción para accesibilidad" /><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><Button type="button" size="icon" variant="outline" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover arriba"><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="outline" onClick={() => move(index, 1)} disabled={index === projects.length - 1} aria-label="Mover abajo"><ArrowDown className="h-4 w-4" /></Button></div><Button type="button" variant="destructive" size="sm" onClick={() => setProjects(projects.filter((_, current) => current !== index).map((entry, sortOrder) => ({ ...entry, sortOrder })))}><Trash2 className="mr-2 h-4 w-4" />Quitar del borrador</Button></div></div></div></article>)}</div>;
}

function PreviewPanel({ content, projects, onEdit, onPublish, publishing }: { content: ContentState; projects: ProjectDraft[]; onEdit: () => void; onPublish: () => void; publishing: boolean }) {
  return <div className="mx-auto max-w-6xl space-y-6"><div className="flex flex-col justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-orange-700">Vista previa privada</p><h2 className="mt-1 text-xl font-bold text-slate-950">Así se verán los cambios antes de publicar</h2><p className="mt-1 text-sm text-slate-600">Esta vista muestra el borrador guardado; el sitio público todavía no cambia.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onEdit}><ArrowLeft className="mr-2 h-4 w-4" />Seguir editando</Button><Button className="bg-orange-500 hover:bg-orange-600" disabled={publishing} onClick={onPublish}>{publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{publishing ? "Publicando…" : "Publicar cambios"}</Button></div></div><section className="overflow-hidden rounded-2xl bg-slate-950 text-white"><div className="grid lg:grid-cols-[1.1fr_.9fr]"><div className="p-8 md:p-12"><p className="text-xs font-bold tracking-[.16em] text-orange-300">{content.heroBadge}</p><h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">{content.heroTitle}<br /><em className="font-serif text-orange-400">{content.heroHighlight}</em></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{content.heroDescription}</p><p className="mt-8 text-sm font-semibold text-slate-200">{content.phoneNumber} · {content.location}</p></div><div className="min-h-64 bg-slate-800">{projects[0]?.imageUrl && <img className="h-full w-full object-cover" src={projects[0].imageUrl} alt={projects[0].altText} />}</div></div></section><section className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-500">Vista previa de la galería</p><div className="mt-5 grid gap-4 md:grid-cols-3">{projects.filter(project => project.visible).map(project => <article key={`${project.title}-${project.sortOrder}`} className="overflow-hidden rounded-xl border border-slate-200"><div className="aspect-[4/3] bg-slate-100">{project.imageUrl && <img className="h-full w-full object-cover" src={project.imageUrl} alt={project.altText} />}</div><div className="p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-orange-600">{project.category}</p><h3 className="mt-1 font-bold text-slate-950">{project.title}</h3><p className="mt-2 text-sm leading-5 text-slate-600">{project.description}</p></div></article>)}</div></section></div>;
}

function AdminWorkspace() {
  const [location, setLocation] = useLocation();
  const isProjectsRoute = location === "/admin/proyectos";
  const isPreviewRoute = location === "/admin/vista-previa";
  const utils = trpc.useUtils();
  const dashboard = trpc.site.admin.dashboard.useQuery();
  const saveDraftMutation = trpc.site.admin.saveDraft.useMutation({ onSuccess: () => utils.site.admin.dashboard.invalidate() });
  const publishDraftMutation = trpc.site.admin.publishDraft.useMutation({ onSuccess: () => utils.site.admin.dashboard.invalidate() });
  const discardDraftMutation = trpc.site.admin.discardDraft.useMutation({ onSuccess: () => utils.site.admin.dashboard.invalidate() });
  const [content, setContent] = useState<ContentState>({});
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!dashboard.data) return;
    const source = dashboard.data.draft ?? { content: Object.entries(dashboard.data.published.content).map(([key, value]) => ({ key, value })), projects: dashboard.data.published.projects };
    setContent(Object.fromEntries(source.content.map(entry => [entry.key, entry.value])));
    setProjects(source.projects.map(project => ({ ...project, imageKey: project.imageKey ?? null })));
  }, [dashboard.data]);

  const draftPayload = useMemo(() => ({ content: Object.entries(content).map(([key, value]) => ({ key, value })), projects }), [content, projects]);
  const saveDraft = async (goToPreview = false) => {
    await saveDraftMutation.mutateAsync(draftPayload);
    setStatus("Borrador guardado. El sitio público no cambió.");
    if (goToPreview) setLocation("/admin/vista-previa");
  };
  const publish = async () => {
    await saveDraftMutation.mutateAsync(draftPayload);
    await publishDraftMutation.mutateAsync();
    setStatus("Cambios publicados en el sitio público.");
    setLocation("/admin");
  };
  const discard = async () => { await discardDraftMutation.mutateAsync(); setStatus("Borrador descartado. Se restauró la última versión publicada."); setLocation("/admin"); };

  if (dashboard.isLoading) return <div className="grid min-h-96 place-items-center"><Loader2 className="animate-spin text-orange-500" /></div>;
  if (dashboard.isError) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">No se pudo cargar el editor. Actualizá la página o volvé a iniciar sesión.</div>;
  if (!dashboard.data) return null;

  const actionBar = <div className="static z-20 flex flex-wrap justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:sticky sm:bottom-4"><Button variant="outline" disabled={discardDraftMutation.isPending} onClick={discard}>Descartar borrador</Button><Button variant="outline" disabled={saveDraftMutation.isPending} onClick={() => saveDraft(true)}><Eye className="mr-2 h-4 w-4" />Guardar y ver vista previa</Button><Button className="bg-orange-500 hover:bg-orange-600" disabled={saveDraftMutation.isPending} onClick={() => saveDraft()}>{saveDraftMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar borrador</Button></div>;
  const previewContent = dashboard.data.draft ? Object.fromEntries(dashboard.data.draft.content.map(entry => [entry.key, entry.value])) : content;
  const previewProjects = dashboard.data.draft?.projects.map(project => ({ ...project, imageKey: project.imageKey ?? null })) ?? projects;

  return <div className="mx-auto max-w-6xl space-y-7 py-2"><header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Administración privada</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Editor de Faro Estructuras</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Guardá cambios como borrador, revisalos y publicalos solo cuando estén listos.</p></div><a className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 underline underline-offset-4" href="/" target="_blank" rel="noreferrer">Ver sitio publicado</a></header>{status && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" />{status}</div>}{isPreviewRoute ? <PreviewPanel content={previewContent} projects={previewProjects} onEdit={() => setLocation("/admin")} onPublish={publish} publishing={publishDraftMutation.isPending} /> : isProjectsRoute ? <><ProjectEditor projects={projects} setProjects={setProjects} />{actionBar}</> : <div className="space-y-7"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Información de negocio</h2><p className="mt-1 text-sm text-slate-600">Estos datos quedarán en el borrador hasta que los publiques.</p><div className="mt-5 grid gap-4 md:grid-cols-3">{businessFields.map(field => <label key={field.key} className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{field.label}</span><Input value={content[field.key] ?? ""} placeholder={field.placeholder} onChange={event => setContent({ ...content, [field.key]: event.target.value })} /></label>)}</div></section><section><div className="mb-4"><h2 className="text-lg font-bold text-slate-950">Textos del sitio</h2><p className="mt-1 text-sm text-slate-600">Editá con tranquilidad: primero guardás un borrador y luego lo revisás antes de publicar.</p></div><ContentEditor content={content} onChange={(key, value) => setContent({ ...content, [key]: value })} /></section>{actionBar}</div>}</div>;
}

export default function AdminPage() { return <ClientPortalGate><AdminWorkspace /></ClientPortalGate>; }
