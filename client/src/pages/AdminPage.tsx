// Admin-only client editor: all writes pass through role-gated tRPC procedures.
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  FileImage,
  Loader2,
  LogOut,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

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

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-950"><Loader2 className="animate-spin text-orange-400" /></div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md space-y-5 rounded-2xl border border-white/15 bg-white/5 p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange-500/15 text-orange-300"><ShieldAlert /></span>
          <h1 className="text-2xl font-semibold">Acceso de administración</h1>
          <p className="text-sm leading-6 text-slate-300">Ingresá con la cuenta autorizada para administrar los textos y las imágenes de Faro Estructuras.</p>
          <Button onClick={startLogin} className="w-full bg-orange-500 hover:bg-orange-600">Iniciar sesión</Button>
          <Link href="/" className="block text-sm text-slate-300 underline underline-offset-4">Volver al sitio público</Link>
        </div>
      </div>
    );
  }
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md space-y-5 rounded-2xl border border-white/15 bg-white/5 p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-500/15 text-red-300"><ShieldAlert /></span>
          <h1 className="text-2xl font-semibold">Cuenta sin permisos</h1>
          <p className="text-sm leading-6 text-slate-300">Esta cuenta inició sesión correctamente, pero todavía no tiene permisos de edición. Pedile al propietario del sitio que la autorice.</p>
          <div className="flex justify-center gap-3"><Button variant="outline" onClick={logout}>Cerrar sesión</Button><Link href="/"><Button>Ver sitio público</Button></Link></div>
        </div>
      </div>
    );
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}

function ContentEditor({ content, onChange }: { content: ContentState; onChange: (key: string, value: string) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {textFields.map(field => (
        <label key={field.key} className={`grid gap-2 rounded-xl border border-slate-200 bg-white p-4 ${field.multiline ? "lg:col-span-2" : ""}`}>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
          {field.multiline ? (
            <Textarea value={content[field.key] ?? ""} onChange={event => onChange(field.key, event.target.value)} rows={3} />
          ) : (
            <Input value={content[field.key] ?? ""} onChange={event => onChange(field.key, event.target.value)} />
          )}
        </label>
      ))}
    </div>
  );
}

function ProjectEditor({ projects, setProjects }: { projects: ProjectDraft[]; setProjects: (projects: ProjectDraft[]) => void }) {
  const utils = trpc.useUtils();
  const saveProject = trpc.site.admin.saveProject.useMutation({ onSuccess: () => utils.site.admin.dashboard.invalidate() });
  const deleteProject = trpc.site.admin.deleteProject.useMutation({ onSuccess: () => utils.site.admin.dashboard.invalidate() });
  const reorderProjects = trpc.site.admin.reorderProjects.useMutation({ onSuccess: () => utils.site.admin.dashboard.invalidate() });
  const uploadImage = trpc.site.admin.uploadImage.useMutation();
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const updateProject = (index: number, patch: Partial<ProjectDraft>) => {
    setProjects(projects.map((project, current) => current === index ? { ...project, ...patch } : project));
  };

  const uploadProjectImage = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      alert("Subí una imagen JPG, PNG o WEBP de hasta 8 MB.");
      return;
    }
    setBusyIndex(index);
    try {
      const uploaded = await uploadImage.mutateAsync({ fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", base64: await readFileAsBase64(file) });
      updateProject(index, { imageUrl: uploaded.url, imageKey: uploaded.key });
    } finally {
      setBusyIndex(null);
    }
  };

  const save = async (index: number) => {
    const project = projects[index];
    if (!project.imageUrl) return alert("Agregá una imagen antes de guardar el proyecto.");
    setBusyIndex(index);
    try {
      await saveProject.mutateAsync(project);
    } finally {
      setBusyIndex(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= projects.length) return;
    const reordered = [...projects];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const normalized = reordered.map((project, sortOrder) => ({ ...project, sortOrder }));
    setProjects(normalized);
    const persisted = normalized.filter(project => project.id).map(project => project.id as number);
    if (persisted.length) await reorderProjects.mutateAsync({ ids: persisted });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-sm leading-6 text-slate-600">Subí fotos de trabajos reales y escribí qué estructura se ve. Los cambios se muestran en la galería pública apenas se guardan.</p><Button type="button" onClick={() => setProjects([...projects, blankProject(projects.length)])}><Plus className="mr-2 h-4 w-4" />Agregar proyecto</Button></div>
      {projects.map((project, index) => (
        <article key={project.id ?? `new-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
            <div className="relative min-h-56 bg-slate-100">
              {project.imageUrl ? <img className="absolute inset-0 h-full w-full object-cover" src={project.imageUrl} alt={project.altText || project.title} /> : <div className="absolute inset-0 grid place-items-center text-slate-400"><FileImage /></div>}
              <label className="absolute bottom-3 left-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-lg"><Upload className="h-4 w-4" />{busyIndex === index ? "Subiendo…" : "Cambiar imagen"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => uploadProjectImage(index, event)} /></label>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Proyecto {String(index + 1).padStart(2, "0")}</span><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={project.visible} onChange={event => updateProject(index, { visible: event.target.checked })} /> Visible en el sitio</label></div>
              <div className="grid gap-3 md:grid-cols-2"><Input aria-label="Categoría" value={project.category} onChange={event => updateProject(index, { category: event.target.value })} placeholder="Categoría" /><Input aria-label="Título" value={project.title} onChange={event => updateProject(index, { title: event.target.value })} placeholder="Título" /></div>
              <Textarea aria-label="Descripción estructural" rows={3} value={project.description} onChange={event => updateProject(index, { description: event.target.value })} placeholder="Descripción estructural" />
              <Input aria-label="Texto alternativo" value={project.altText} onChange={event => updateProject(index, { altText: event.target.value })} placeholder="Descripción para accesibilidad" />
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><Button type="button" size="icon" variant="outline" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover arriba"><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="icon" variant="outline" onClick={() => move(index, 1)} disabled={index === projects.length - 1} aria-label="Mover abajo"><ArrowDown className="h-4 w-4" /></Button></div><div className="flex gap-2"><Button type="button" variant="destructive" size="sm" disabled={!project.id || busyIndex === index} onClick={async () => { if (project.id && confirm("¿Eliminar este proyecto de la galería?")) { await deleteProject.mutateAsync({ id: project.id }); setProjects(projects.filter((_, current) => current !== index)); } }}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button><Button type="button" size="sm" disabled={busyIndex === index || saveProject.isPending} onClick={() => save(index)}><Save className="mr-2 h-4 w-4" />Guardar proyecto</Button></div></div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function AdminWorkspace() {
  const [location] = useLocation();
  const isProjectsRoute = location === "/admin/proyectos";
  const utils = trpc.useUtils();
  const dashboard = trpc.site.admin.dashboard.useQuery();
  const updateContent = trpc.site.admin.updateContent.useMutation({ onSuccess: () => utils.site.admin.dashboard.invalidate() });
  const [content, setContent] = useState<ContentState>({});
  const [projects, setProjects] = useState<ProjectDraft[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!dashboard.data) return;
    setContent(dashboard.data.content);
    setProjects(dashboard.data.projects.map(project => ({ ...project, imageKey: project.imageKey ?? null })));
  }, [dashboard.data]);

  const contentUpdates = useMemo(() => Object.entries(content).map(([key, value]) => ({ key, value })), [content]);
  const saveContent = async () => {
    await updateContent.mutateAsync({ updates: contentUpdates });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2800);
  };

  if (dashboard.isLoading) return <div className="grid min-h-96 place-items-center"><Loader2 className="animate-spin text-orange-500" /></div>;
  if (dashboard.isError) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">No se pudo cargar el editor. Actualizá la página o volvé a iniciar sesión.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-7 py-2">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Administración privada</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Editor de Faro Estructuras</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Actualizá textos, datos de contacto y fotos de trabajos sin modificar código.</p></div><a className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 underline underline-offset-4" href="/" target="_blank" rel="noreferrer">Ver sitio público <ExternalLink className="h-4 w-4" /></a></header>
      {isProjectsRoute ? <ProjectEditor projects={projects} setProjects={setProjects} /> : <div className="space-y-7"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-5"><div><h2 className="text-lg font-bold text-slate-950">Información de negocio</h2><p className="mt-1 text-sm text-slate-600">Estos datos aparecen en los botones de contacto y el pie de página.</p></div>{saved && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Guardado</span>}</div><div className="mt-5 grid gap-4 md:grid-cols-3">{businessFields.map(field => <label key={field.key} className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{field.label}</span><Input value={content[field.key] ?? ""} placeholder={field.placeholder} onChange={event => setContent({ ...content, [field.key]: event.target.value })} /></label>)}</div></section><section><div className="mb-4"><h2 className="text-lg font-bold text-slate-950">Textos del sitio</h2><p className="mt-1 text-sm text-slate-600">Mantené el tono directo y claro de Faro Estructuras. Los textos guardados se actualizan en el sitio público.</p></div><ContentEditor content={content} onChange={(key, value) => setContent({ ...content, [key]: value })} /></section><div className="sticky bottom-4 flex justify-end"><Button size="lg" className="bg-orange-500 px-6 hover:bg-orange-600" disabled={updateContent.isPending} onClick={saveContent}>{updateContent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{updateContent.isPending ? "Guardando…" : "Guardar cambios"}</Button></div></div>}
    </div>
  );
}

export default function AdminPage() {
  return <AdminGuard><AdminWorkspace /></AdminGuard>;
}
