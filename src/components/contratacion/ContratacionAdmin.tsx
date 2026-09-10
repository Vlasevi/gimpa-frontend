// components/contratacion/ContratacionAdmin.tsx
import { useState, useEffect, useRef } from "react";
import {
  X, FilePlus, Eye, Download, Upload, Trash2,
  User, Home, ShieldCheck, Landmark, Wallet, FileText, Camera, Building, Info, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiUrl, API_ENDPOINTS, apiFetch, buildHeaders } from "@/utils/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DisplayField } from "@/components/matriculas/matriculasUI/DisplayField";
import { Alert } from "@/components/ui/Alert";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  DATA_FIELDS,
  DATA_SECTIONS,
  CONTRACT_DOCUMENTS,
  STATUS_LABELS,
  STATUS_BADGE,
  computeNominaTotal,
  computeSalaryCombined,
  computeFullName,
  computeAge,
  formatMoney,
} from "./contractConfig";

interface Contract {
  id: number;
  employee: { email: string; first_name: string; last_name: string; displayname: string; role: string };
  year: number;
  position?: { id: number; name: string } | null;
  subcargo?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  is_vinculado: boolean;
  is_deleted?: boolean;
  data: Record<string, any> | null;
  documents_metadata: Record<string, any> | null;
  correction_comment?: string | null;
}

interface Position { id: number; name: string }
interface Template { id: number; name: string }
interface UserRow { email: string; first_name: string; last_name: string; displayname?: string; role: string }

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  rector: "Rector",
  administrativo: "Administrativo",
  teacher: "Docente",
  psychologist: "Psicología",
  otros: "Otros",
  student: "Estudiante",
};

const userDisplay = (u: UserRow) => {
  const name = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.displayname || u.email;
  return `${name} — ${ROLE_LABELS[u.role] || u.role}`;
};

const docLabel = (key: string) => {
  // Exámenes médicos anuales de indefinidos: examen_anual_2027 -> "Examen Anual 2027"
  const annual = key.match(/^examen_anual_(\d{4})$/);
  if (annual) return `Examen Anual ${annual[1]}`;
  return (
    CONTRACT_DOCUMENTS.find((d) => d.key === key)?.label ||
    key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
};

export const ContratacionAdmin = ({ readOnly = false }: { readOnly?: boolean }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnable, setShowEnable] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const notify = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const contractsUrl =
        `${API_ENDPOINTS.contracts}?year=${selectedYear}` +
        (showDeleted ? "&include_deleted=true" : "");
      const [cRes, pRes, tRes] = await Promise.all([
        fetch(apiUrl(contractsUrl), { credentials: "include" }),
        fetch(apiUrl(API_ENDPOINTS.positions), { credentials: "include" }),
        fetch(apiUrl(API_ENDPOINTS.contractTemplates), { credentials: "include" }),
      ]);
      if (cRes.ok) setContracts(await cRes.json());
      if (pRes.ok) setPositions(await pRes.json());
      if (tRes.ok) setTemplates(await tRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, showDeleted]);

  return (
    <div className="container mx-auto px-6 pt-2 pb-6">
      {toast && (
        <div className="toast toast-top toast-end z-[60]">
          <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-error"} shadow-lg`}>
            <span>{toast.msg}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setToast(null)}
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-secondary">Contratación</h1>
          <p className="text-base-content/60 mt-1">
            {readOnly ? "Consulta de contrataciones" : "Gestión de contrataciones de empleados"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="label cursor-pointer gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            <span className="label-text">Mostrar eliminadas</span>
          </label>
          <FilterSelect
            className="w-28"
            ariaLabel="Filtrar por año"
            value={String(selectedYear)}
            onChange={(v) => setSelectedYear(Number(v))}
            options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
          />
          {!readOnly && (
            <>
              <button className="btn btn-outline gap-2" onClick={() => setShowTemplates(true)}>
                <Upload size={18} /> Plantillas
              </button>
              <button className="btn btn-primary gap-2" onClick={() => setShowEnable(true)}>
                <FilePlus size={18} /> Habilitar contratación
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingState compact className="py-16" label="Cargando contrataciones…" />
      ) : (
        <div className="overflow-x-auto bg-base-100 rounded-lg border border-base-300 shadow-sm">
          <table className="table">
            <thead className="bg-base-200 text-base-content">
              <tr>
                <th>Empleado</th>
                <th>Puesto</th>
                <th>Estado</th>
                <th>Vínculo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className={`hover:bg-base-200/50 transition-colors ${c.is_deleted ? "opacity-60" : ""}`}>
                  <td>
                    <div className="font-medium flex items-center gap-2">
                      {c.employee.first_name} {c.employee.last_name}
                      {c.is_deleted && <span className="badge badge-error badge-sm">Eliminada</span>}
                    </div>
                    <div className="text-xs text-base-content/50">{c.employee.email}</div>
                  </td>
                  <td>{c.position?.name || "—"}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[c.status] || "badge-ghost"}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${c.is_vinculado ? "badge-success" : "badge-ghost"}`}>
                      {c.is_vinculado ? "Vinculado" : "Desvinculado"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="p-2 text-base-content/40 hover:text-primary hover:bg-primary/10 rounded-full transition-all cursor-pointer"
                      title="Ver detalles"
                      onClick={() => setSelected(c)}
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-base-content/50 py-8">
                    No hay contrataciones para {selectedYear}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showEnable && (
        <EnableModal
          year={selectedYear}
          positions={positions}
          templates={templates}
          notify={notify}
          onClose={() => setShowEnable(false)}
          onSuccess={() => { setShowEnable(false); fetchAll(); }}
        />
      )}

      {showTemplates && (
        <TemplatesModal
          templates={templates}
          notify={notify}
          onClose={() => setShowTemplates(false)}
          onChanged={fetchAll}
        />
      )}

      {selected && (
        <DetailModal
          contract={selected}
          positions={positions}
          templates={templates}
          readOnly={readOnly}
          notify={notify}
          onClose={() => setSelected(null)}
          onChanged={() => { fetchAll(); }}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Select con búsqueda por texto (muestra ~5 ítems con scroll)
// ----------------------------------------------------------------------------
const SearchSelect = ({
  value,
  onChange,
  options,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative" ref={ref}>
      <input
        className="input input-bordered w-full"
        placeholder={placeholder}
        value={open ? query : selectedLabel}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(""); }}
      />
      {open && (
        <ul className="absolute z-30 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-base-content/40">Sin resultados</li>
          )}
          {filtered.map((o) => (
            <li
              key={o.value}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 ${
                o.value === value ? "bg-primary/5 font-medium" : ""
              }`}
              onMouseDown={() => { onChange(o.value); setOpen(false); setQuery(""); }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Modal: Habilitar contratación
// ----------------------------------------------------------------------------
const EnableModal = ({
  year,
  positions,
  templates,
  notify,
  onClose,
  onSuccess,
}: {
  year: number;
  positions: Position[];
  templates: Template[];
  notify: (type: "success" | "error", msg: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState<Record<string, string>>({
    employee_email: "",
    year: String(year),
    position_id: "",
    template_id: "",
    subcargo: "",
    start_date: "",
    end_date: "",
  });
  const [nomina, setNomina] = useState<Record<string, string>>({});
  const [indefinite, setIndefinite] = useState(false);
  const [saving, setSaving] = useState(false);
  const nominaFields = DATA_FIELDS.filter((f) => f.section === "nomina" && !f.computed);
  const nominaTotal = computeNominaTotal(nomina);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl(API_ENDPOINTS.users), { credentials: "include" });
        if (res.ok) {
          const list: UserRow[] = await res.json();
          setUsers(list.filter((u) => u.role !== "student" && u.role !== "admin"));
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const submit = async () => {
    if (!form.employee_email) { notify("error", "Selecciona un empleado."); return; }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        employee_email: form.employee_email,
        year: Number(form.year) || year,
        subcargo: form.subcargo || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (form.position_id) body.position_id = Number(form.position_id);
      if (form.template_id) body.template_id = Number(form.template_id);
      body.end_date = indefinite ? null : (form.end_date || null);
      const cleanNomina = Object.fromEntries(
        Object.entries(nomina).filter(([, v]) => v !== ""),
      );
      if (Object.keys(cleanNomina).length) {
        body.data = {
          ...cleanNomina,
          total: formatMoney(String(nominaTotal)),
          salary: computeSalaryCombined(nomina),
        };
      }
      const res = await apiFetch(API_ENDPOINTS.contracts, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al habilitar");
      notify("success", "Contratación habilitada correctamente.");
      onSuccess();
    } catch (e: any) {
      notify("error", e.message || "Error al habilitar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose} title="Habilitar contratación">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Empleado">
          <SearchSelect
            value={form.employee_email}
            onChange={(v) => setForm({ ...form, employee_email: v })}
            placeholder="Buscar empleado..."
            options={users.map((u) => ({
              value: u.email,
              label: userDisplay(u),
            }))}
          />
        </Field>
        <Field label="Año">
          <input type="number" className="input input-bordered w-full"
            value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
        </Field>
        <Field label="Puesto">
          <SearchSelect
            value={form.position_id}
            onChange={(v) => setForm({ ...form, position_id: v })}
            placeholder="Buscar puesto..."
            options={[
              { value: "", label: "— Ninguno —" },
              ...positions.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
          />
        </Field>
        <Field label="Subcargo">
          <input className="input input-bordered w-full"
            value={form.subcargo} onChange={(e) => setForm({ ...form, subcargo: e.target.value })} />
        </Field>
        <Field label="Plantilla de contrato">
          <SearchSelect
            value={form.template_id}
            onChange={(v) => setForm({ ...form, template_id: v })}
            placeholder="Buscar plantilla..."
            options={[
              { value: "", label: "— Ninguna —" },
              ...templates.map((t) => ({ value: String(t.id), label: t.name })),
            ]}
          />
        </Field>
        <Field label="Fecha de ingreso">
          <input type="date" className="input input-bordered w-full"
            value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </Field>
        <Field label="¿Contrato a término indefinido?">
          <label className="label cursor-pointer justify-start gap-2">
            <input type="checkbox" className="checkbox checkbox-sm"
              checked={indefinite} onChange={(e) => setIndefinite(e.target.checked)} />
            <span className="label-text">Sí, sin fecha de salida</span>
          </label>
        </Field>
        {!indefinite && (
          <Field label="Fecha de salida">
            <input type="date" className="input input-bordered w-full"
              value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </Field>
        )}
      </div>

      <h3 className="font-semibold text-base-content mt-4 mb-2 border-b border-base-300 pb-1 text-sm">
        Nómina
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {nominaFields.map((f) => {
          const isMoney = f.type === "number";
          return (
            <Field key={f.key} label={f.label}>
              <input
                type="text"
                inputMode={isMoney ? "numeric" : undefined}
                className="input input-bordered w-full"
                value={nomina[f.key] ?? ""}
                onChange={(e) =>
                  setNomina({
                    ...nomina,
                    [f.key]: isMoney ? formatMoney(e.target.value) : e.target.value,
                  })
                }
              />
            </Field>
          );
        })}
        <Field label="Total (automático)">
          <input
            type="text"
            className="input input-bordered w-full bg-base-200 text-base-content/50 cursor-not-allowed"
            value={nominaTotal ? formatMoney(String(nominaTotal)) : ""}
            disabled
            readOnly
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : "Habilitar"}
        </button>
      </div>
    </Overlay>
  );
};

// ----------------------------------------------------------------------------
// Modal: Detalle (estructura similar a la vista de matrícula del estudiante)
// ----------------------------------------------------------------------------
const SECTION_ICONS: Record<string, LucideIcon> = {
  personal: User,
  contacto: Home,
  seguridad_social: ShieldCheck,
  bancario: Landmark,
  nomina: Wallet,
};

const fmtDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const DetailModal = ({
  contract,
  positions,
  readOnly,
  notify,
  onClose,
  onChanged,
}: {
  contract: Contract;
  positions: Position[];
  templates: Template[];
  readOnly: boolean;
  notify: (type: "success" | "error", msg: string) => void;
  onClose: () => void;
  onChanged: () => void;
}) => {
  useBodyScrollLock(true);
  const [tab, setTab] = useState<string>(DATA_SECTIONS[0]?.id || "personal");
  const [data, setData] = useState<Record<string, any>>(contract.data || {});
  const [docs, setDocs] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"soft" | "hard" | "restore" | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    acceptText: string;
    variant: "warning" | "error" | "info" | "success";
    onAccept: () => void;
  } | null>(null);
  const [meta, setMeta] = useState({
    position_id: contract.position?.id ? String(contract.position.id) : "",
    subcargo: contract.subcargo || "",
    start_date: contract.start_date || "",
    end_date: contract.end_date || "",
  });
  const [indefinite, setIndefinite] = useState(!contract.end_date);
  // Año del examen médico anual a subir (indefinidos): 1 documento por año.
  const [examYear, setExamYear] = useState(new Date().getFullYear());
  const canManage = !readOnly;

  const loadDocs = async () => {
    try {
      const res = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contract.id)), {
        credentials: "include", headers: buildHeaders(),
      });
      if (res.ok) setDocs((await res.json()).documents || {});
    } catch (e) { console.error(e); }
  };
  useEffect(() => { loadDocs(); /* eslint-disable-next-line */ }, [contract.id]);

  const saveData = async () => {
    setBusy(true);
    try {
      const payload: Record<string, any> = { ...data, full_name: computeFullName(data) };
      if (data.birth_date) payload.age = computeAge(data.birth_date);
      const hasNomina = ["salary_text", "salary_number", "transport_allowance", "otros"]
        .some((k) => data[k] != null && data[k] !== "");
      if (hasNomina) {
        payload.total = formatMoney(String(computeNominaTotal(data)));
        payload.salary = computeSalaryCombined(data);
      }
      const res = await apiFetch(API_ENDPOINTS.contractById(contract.id), {
        method: "PATCH",
        body: JSON.stringify({
          data: payload,
          position_id: meta.position_id ? Number(meta.position_id) : null,
          subcargo: meta.subcargo || null,
          start_date: meta.start_date || null,
          end_date: indefinite ? null : (meta.end_date || null),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error guardando");
      notify("success", "Contratación actualizada.");
      onChanged();
      onClose();
    } catch (e: any) { notify("error", e.message || "Error guardando"); } finally { setBusy(false); }
  };

  const setStatus = async (status: string, correction_comment?: string) => {
    setBusy(true);
    setPendingStatus(status);
    try {
      const body: Record<string, any> = { status };
      if (correction_comment) body.correction_comment = correction_comment;
      const res = await apiFetch(API_ENDPOINTS.contractById(contract.id), {
        method: "PATCH", body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error");
      const verb: Record<string, string> = {
        APPROVED: "aprobada", REJECTED: "rechazada", PENDING: "devuelta a corrección",
      };
      notify("success", `Contratación ${verb[status] || "actualizada"}.`);
      onChanged();
      onClose();
    } catch (e: any) { notify("error", e.message || "Error"); } finally { setBusy(false); setPendingStatus(null); }
  };

  const deleteContract = async (hard: boolean) => {
    setBusy(true);
    setPendingAction(hard ? "hard" : "soft");
    try {
      const url = API_ENDPOINTS.contractById(contract.id) + (hard ? "?hard=true" : "");
      const res = await fetch(apiUrl(url), {
        method: "DELETE", credentials: "include", headers: buildHeaders(),
      });
      if (!res.ok && res.status !== 204) {
        throw new Error((await res.json().catch(() => ({}))).error || "Error al eliminar");
      }
      notify("success", hard ? "Contratación eliminada permanentemente." : "Contratación eliminada.");
      onChanged();
      onClose();
    } catch (e: any) { notify("error", e.message || "Error al eliminar"); } finally { setBusy(false); setPendingAction(null); }
  };

  const restoreContract = async () => {
    setBusy(true);
    setPendingAction("restore");
    try {
      const res = await apiFetch(API_ENDPOINTS.contractRestore(contract.id), { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error al restaurar");
      notify("success", "Contratación restaurada.");
      onChanged();
      onClose();
    } catch (e: any) { notify("error", e.message || "Error al restaurar"); } finally { setBusy(false); setPendingAction(null); }
  };

  const uploadDoc = async (key: string, file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append(key, file);
      const res = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contract.id)), {
        method: "POST", credentials: "include", headers: buildHeaders({}, false), body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al subir");
      await loadDocs();
      notify("success", "Documento actualizado.");
      onChanged();
    } catch (e: any) { notify("error", e.message || "Error al subir"); } finally { setBusy(false); }
  };

  const deleteDoc = async (key: string) => {
    setBusy(true);
    try {
      const res = await fetch(
        `${apiUrl(API_ENDPOINTS.contractDocuments(contract.id))}?doc_key=${encodeURIComponent(key)}`,
        { method: "DELETE", credentials: "include", headers: buildHeaders() },
      );
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      await loadDocs();
      notify("success", "Documento eliminado.");
      onChanged();
    } catch (e: any) { notify("error", e.message || "Error"); } finally { setBusy(false); }
  };

  const photoUrl: string | null = docs["profile_photo"]?.url || null;
  const fullName =
    `${contract.employee.first_name} ${contract.employee.last_name}`.trim() ||
    contract.employee.email;

  // Agrupar documentos para la pestaña Documentos
  const docGroups = (() => {
    const groups: Record<string, [string, any][]> = { foto: [], institucion: [], documentos: [] };
    Object.entries(docs).forEach(([key, meta]) => {
      if (key === "profile_photo") groups.foto.push([key, meta]);
      else if (key === "contrato_firmado" || key === "manual_funciones_firmado" || key.startsWith("documentos/"))
        groups.institucion.push([key, meta]);
      else groups.documentos.push([key, meta]);
    });
    return groups;
  })();
  const GROUP_META: Record<string, { title: string; icon: LucideIcon }> = {
    foto: { title: "Foto", icon: Camera },
    documentos: { title: "Documentos", icon: FileText },
    institucion: { title: "Documentos Institución", icon: Building },
  };

  const renderDocCard = ([key, meta]: [string, any]) => (
    <div key={key} className="flex items-center justify-between gap-3 p-3 bg-base-100 border border-base-300 rounded-lg hover:border-primary/30 hover:shadow-md transition-all duration-200">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-base-content truncate">{docLabel(key)}</p>
        {meta.uploaded_at && <p className="text-xs text-base-content/50">{fmtDate(meta.uploaded_at)}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {meta.url && (
          <a className="p-2 text-primary hover:bg-primary/10 rounded-lg" href={meta.url} target="_blank" rel="noreferrer" title="Abrir">
            <Download className="h-4 w-4" />
          </a>
        )}
        {canManage && (
          <>
            <label className="p-2 text-info hover:bg-info/10 rounded-lg cursor-pointer" title="Cambiar">
              <Upload className="h-4 w-4" />
              <input type="file" className="hidden"
                onChange={(e) => { uploadDoc(key, e.target.files?.[0]); e.currentTarget.value = ""; }} />
            </label>
            <button
              className="p-2 text-error hover:bg-error/10 rounded-lg"
              onClick={() =>
                setConfirmState({
                  title: "Eliminar documento",
                  message: "¿Eliminar este documento? Esta acción no se puede deshacer.",
                  acceptText: "Eliminar",
                  variant: "error",
                  onAccept: () => deleteDoc(key),
                })
              }
              title="Borrar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-base-200 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-base-300">
        {/* Cabecera con avatar */}
        <header className="bg-base-100 border-b border-base-300 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-primary p-1 bg-base-100 shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="Empleado" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary/60" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-secondary leading-tight">{fullName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 align-middle">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                  {STATUS_LABELS[contract.status] || contract.status}
                </span>
                {contract.position?.name && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                    {contract.position.name}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                  {contract.year}
                </span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                  {contract.is_vinculado ? "Vinculado" : "Desvinculado"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="p-2 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
            onClick={onClose}
          >
            <X className="h-6 w-6 text-base-content" />
          </button>
        </header>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-6">
          {contract.correction_comment && (
            <div className="alert alert-warning mb-3">
              <span><strong>Corrección:</strong> {contract.correction_comment}</span>
            </div>
          )}

          {/* Toolbar de edición (admin, solo en secciones de datos) */}
          {canManage && tab !== "documentos" && (
            <div className="flex justify-end mb-3">
              {editing ? (
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" disabled={busy}
                    onClick={() => {
                      setData(contract.data || {});
                      setMeta({
                        position_id: contract.position?.id ? String(contract.position.id) : "",
                        subcargo: contract.subcargo || "",
                        start_date: contract.start_date || "",
                        end_date: contract.end_date || "",
                      });
                      setIndefinite(!contract.end_date);
                      setEditing(false);
                    }}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={busy}
                    onClick={async () => { await saveData(); setEditing(false); }}>
                    {busy ? <span className="loading loading-spinner loading-xs" /> : "Guardar datos"}
                  </button>
                </div>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                  Editar datos
                </button>
              )}
            </div>
          )}

          {/* Pestañas (mismos componentes/estilos que la vista de matrícula) */}
          <Tabs value={tab} onValueChange={(v) => setTab(v)} className="w-full">
            <div className="overflow-x-auto mb-4 pb-1">
              <TabsList className="inline-flex gap-1 p-1 bg-base-200 rounded-lg min-w-max">
                {DATA_SECTIONS.map((s) => {
                  const Icon = SECTION_ICONS[s.id] || User;
                  return (
                    <TabsTrigger
                      key={s.id}
                      value={s.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-content data-[state=active]:shadow-sm data-[state=inactive]:text-base-content/60 data-[state=inactive]:hover:bg-base-300 whitespace-nowrap"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{s.label}</span>
                    </TabsTrigger>
                  );
                })}
                <TabsTrigger
                  value="documentos"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-content data-[state=active]:shadow-sm data-[state=inactive]:text-base-content/60 data-[state=inactive]:hover:bg-base-300 whitespace-nowrap"
                >
                  <FileText className="h-4 w-4" />
                  <span>Documentos</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-[220px]">
              {DATA_SECTIONS.map((s) => {
                const fields = DATA_FIELDS.filter((f) => f.section === s.id);
                const hasData = fields.some(
                  (f) => data[f.key] !== undefined && data[f.key] !== null && data[f.key] !== "",
                );
                return (
                  <TabsContent key={s.id} value={s.id} className="mt-0 h-full">
                    {editing && canManage ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-base-100 rounded-lg">
                        {fields.map((f) => {
                          const computedValue = f.computed
                            ? (f.key === "total"
                                ? formatMoney(String(computeNominaTotal(data)))
                                : f.key === "full_name"
                                  ? computeFullName(data)
                                  : f.key === "age"
                                    ? computeAge(data.birth_date)
                                    : computeSalaryCombined(data))
                            : null;
                          const isMoney = f.section === "nomina" && f.type === "number" && !f.computed;
                          return (
                            <div key={f.key} className="form-control">
                              <label className="label py-1">
                                <span className="label-text text-xs font-semibold text-base-content/60">{f.label}</span>
                              </label>
                              {f.computed ? (
                                <input
                                  type="text"
                                  className="input input-bordered input-sm bg-base-200 text-base-content/50 cursor-not-allowed"
                                  value={computedValue ?? ""}
                                  disabled
                                  readOnly
                                />
                              ) : (
                                <input
                                  type="text"
                                  inputMode={isMoney ? "numeric" : undefined}
                                  className="input input-bordered input-sm"
                                  value={data[f.key] ?? ""}
                                  onChange={(e) =>
                                    setData({
                                      ...data,
                                      [f.key]: isMoney ? formatMoney(e.target.value) : e.target.value,
                                    })
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : hasData ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-base-100 rounded-lg">
                        {fields.map((f) => (
                          <DisplayField key={f.key} label={f.label} value={data[f.key]} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-base-content/40">
                        <Info className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">Aún no hay información registrada</p>
                      </div>
                    )}
                    {s.id === "personal" && (
                      <div className="mt-6 p-4 bg-base-100 rounded-lg">
                        <h4 className="text-sm font-bold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" /> Contrato
                        </h4>
                        {editing && canManage ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="form-control">
                              <label className="label py-1"><span className="label-text text-xs font-semibold text-base-content/60">Puesto</span></label>
                              <select className="select select-bordered select-sm" value={meta.position_id}
                                onChange={(e) => setMeta({ ...meta, position_id: e.target.value })}>
                                <option value="">— Ninguno —</option>
                                {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </div>
                            <div className="form-control">
                              <label className="label py-1"><span className="label-text text-xs font-semibold text-base-content/60">Subcargo</span></label>
                              <input className="input input-bordered input-sm" value={meta.subcargo}
                                onChange={(e) => setMeta({ ...meta, subcargo: e.target.value })} />
                            </div>
                            <div className="form-control">
                              <label className="label py-1"><span className="label-text text-xs font-semibold text-base-content/60">Fecha de ingreso</span></label>
                              <input type="date" className="input input-bordered input-sm" value={meta.start_date}
                                onChange={(e) => setMeta({ ...meta, start_date: e.target.value })} />
                            </div>
                            <div className="form-control">
                              <label className="label py-1"><span className="label-text text-xs font-semibold text-base-content/60">¿Término indefinido?</span></label>
                              <label className="label cursor-pointer justify-start gap-2 py-1">
                                <input type="checkbox" className="checkbox checkbox-sm" checked={indefinite}
                                  onChange={(e) => setIndefinite(e.target.checked)} />
                                <span className="label-text text-xs">Sin fecha de salida</span>
                              </label>
                            </div>
                            {!indefinite && (
                              <div className="form-control">
                                <label className="label py-1"><span className="label-text text-xs font-semibold text-base-content/60">Fecha de salida</span></label>
                                <input type="date" className="input input-bordered input-sm" value={meta.end_date}
                                  onChange={(e) => setMeta({ ...meta, end_date: e.target.value })} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <DisplayField label="Puesto" value={contract.position?.name} />
                            <DisplayField label="Subcargo" value={contract.subcargo} />
                            <DisplayField label="Fecha de ingreso" value={contract.start_date} />
                            <DisplayField label="Fecha de salida" value={contract.end_date || "Término indefinido"} />
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                );
              })}

              <TabsContent value="documentos" className="mt-0">
                <div className="p-4 bg-base-100 rounded-lg space-y-6">
                  {Object.keys(docs).length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-base-content/40">
                      <Info className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm">No hay documentos subidos aún</p>
                    </div>
                  )}
                  {(["foto", "documentos", "institucion"] as const).map((g) => {
                    const items = docGroups[g];
                    if (!items || items.length === 0) return null;
                    const GM = GROUP_META[g];
                    const Icon = GM.icon;
                    return (
                      <div key={g}>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" /> {GM.title}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {items.map(renderDocCard)}
                        </div>
                      </div>
                    );
                  })}
                  {canManage && (
                    <div className="pt-3 border-t space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Exámenes médicos
                      </h3>
                      {/* Ingreso (siempre) y egreso (solo término fijo). Si ya están subidos,
                          se gestionan desde su tarjeta arriba (cambiar/borrar). */}
                      <div className="flex flex-wrap items-center gap-2">
                        {!docs["examen_ingreso"] && (
                          <label className="btn btn-outline btn-sm cursor-pointer">
                            <Upload size={16} /> Subir Examen de Ingreso
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                              onChange={(e) => { uploadDoc("examen_ingreso", e.target.files?.[0]); e.currentTarget.value = ""; }} />
                          </label>
                        )}
                        {contract.end_date && !docs["examen_egreso"] && (
                          <label className="btn btn-outline btn-sm cursor-pointer">
                            <Upload size={16} /> Subir Examen de Egreso
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                              onChange={(e) => { uploadDoc("examen_egreso", e.target.files?.[0]); e.currentTarget.value = ""; }} />
                          </label>
                        )}
                      </div>
                      {/* Examen anual por año: solo indefinidos, acumula uno por año. */}
                      {!contract.end_date && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input type="number" min={2000} max={2100}
                              className="input input-bordered input-sm w-24"
                              value={examYear}
                              onChange={(e) => setExamYear(Number(e.target.value) || new Date().getFullYear())} />
                            <label className="btn btn-outline btn-sm cursor-pointer">
                              <Upload size={16} /> Subir examen anual
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                onChange={(e) => { uploadDoc(`examen_anual_${examYear}`, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                            </label>
                          </div>
                          <p className="text-xs text-base-content/40">
                            Se guarda uno por año (Examen Anual {examYear}); no reemplaza los años anteriores.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {canManage && (
                    <div className="pt-3 border-t">
                      <label className="btn btn-outline btn-sm cursor-pointer">
                        <Upload size={16} /> Subir/Cambiar PDF del contrato
                        <input type="file" accept="application/pdf" className="hidden"
                          onChange={(e) => { uploadDoc("contrato_firmado", e.target.files?.[0]); e.currentTarget.value = ""; }} />
                      </label>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer fijo con acciones: una sola barra, para que el cuerpo tenga
            un único scroll (sin doble barra) y las acciones queden siempre visibles. */}
        {canManage && (
          <footer className="flex flex-wrap items-center justify-between gap-2 shrink-0 border-t border-base-300 bg-base-100 px-6 py-3">
            {/* Eliminar / restaurar (izquierda) */}
            <div className="flex flex-wrap gap-2">
              {contract.is_deleted ? (
                <button className="btn btn-success btn-sm" disabled={busy} onClick={restoreContract}>
                  {pendingAction === "restore" ? <span className="loading loading-spinner loading-xs" /> : "Restaurar"}
                </button>
              ) : (
                <button
                  className="btn btn-outline btn-warning btn-sm gap-1"
                  disabled={busy}
                  onClick={() =>
                    setConfirmState({
                      title: "Eliminar contratación",
                      message: "¿Eliminar esta contratación? Podrás restaurarla más adelante.",
                      acceptText: "Eliminar",
                      variant: "warning",
                      onAccept: () => deleteContract(false),
                    })
                  }
                >
                  {pendingAction === "soft" ? <span className="loading loading-spinner loading-xs" /> : <><Trash2 size={14} /> Eliminar</>}
                </button>
              )}
              <button
                className="btn btn-outline btn-error btn-sm gap-1"
                disabled={busy}
                onClick={() =>
                  setConfirmState({
                    title: "Eliminar permanentemente",
                    message:
                      "¿Eliminar PERMANENTEMENTE esta contratación y sus documentos? Esta acción no se puede deshacer.",
                    acceptText: "Eliminar",
                    variant: "error",
                    onAccept: () => deleteContract(true),
                  })
                }
              >
                {pendingAction === "hard" ? <span className="loading loading-spinner loading-xs" /> : <><Trash2 size={14} /> Eliminar permanentemente</>}
              </button>
            </div>

            {/* Flujo de aprobación (derecha, solo en revisión) */}
            {contract.status === "IN_REVIEW" && (
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-warning btn-sm" disabled={busy}
                  onClick={() => { setCorrectionText(""); setShowCorrection(true); }}>
                  Solicitar corrección
                </button>
                <button className="btn btn-error btn-sm" disabled={busy} onClick={() => setStatus("REJECTED")}>
                  {pendingStatus === "REJECTED" ? <span className="loading loading-spinner loading-xs" /> : "Rechazar"}
                </button>
                <button className="btn btn-success btn-sm" disabled={busy} onClick={() => setStatus("APPROVED")}>
                  {pendingStatus === "APPROVED" ? <span className="loading loading-spinner loading-xs" /> : "Aprobar"}
                </button>
              </div>
            )}
          </footer>
        )}
      </div>

      {showCorrection && (
        <Overlay title="Solicitar corrección" onClose={() => setShowCorrection(false)}>
          <p className="text-sm text-base-content/60 mb-2">
            Describe qué debe corregir el empleado. Volverá a estado editable y recibirá el comentario.
          </p>
          <textarea
            className="textarea textarea-bordered w-full h-32"
            placeholder="Mensaje de corrección..."
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCorrection(false)} disabled={busy}>
              Cancelar
            </button>
            <button
              className="btn btn-warning btn-sm"
              disabled={busy || !correctionText.trim()}
              onClick={() => setStatus("PENDING", correctionText.trim())}
            >
              {pendingStatus === "PENDING" ? <span className="loading loading-spinner loading-xs" /> : "Enviar corrección"}
            </button>
          </div>
        </Overlay>
      )}

      {/* Confirmación con estilo (reemplaza confirm() nativo) */}
      {confirmState && (
        <Alert
          isOpen={true}
          onClose={() => setConfirmState(null)}
          onAccept={() => {
            const cb = confirmState.onAccept;
            setConfirmState(null);
            cb();
          }}
          title={confirmState.title}
          variant={confirmState.variant}
          acceptText={confirmState.acceptText}
          cancelText="Cancelar"
          acceptButtonVariant={confirmState.variant === "error" ? "destructive" : "default"}
        >
          <p className="text-base-content/80">{confirmState.message}</p>
        </Alert>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Modal: Plantillas de contrato (subir PDF)
// ----------------------------------------------------------------------------
const TemplatesModal = ({
  templates,
  notify,
  onClose,
  onChanged,
}: {
  templates: Template[];
  notify: (type: "success" | "error", msg: string) => void;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fieldMap, setFieldMap] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const remove = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(apiUrl(API_ENDPOINTS.contractTemplateById(id)), {
        method: "DELETE", credentials: "include", headers: buildHeaders(),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error al eliminar");
      notify("success", "Plantilla eliminada.");
      onChanged();
    } catch (e: any) {
      notify("error", e.message || "Error al eliminar la plantilla");
    } finally {
      setDeletingId(null);
    }
  };

  const upload = async () => {
    if (!name || !file) { notify("error", "Nombre y archivo PDF son requeridos."); return; }
    // Validar JSON del mapeo (si se proporciona)
    let mapStr = "";
    if (fieldMap.trim()) {
      try {
        JSON.parse(fieldMap);
        mapStr = fieldMap.trim();
      } catch {
        notify("error", "El mapeo de campos no es un JSON válido.");
        return;
      }
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("file", file);
      if (mapStr) fd.append("field_map", mapStr);
      const res = await fetch(apiUrl(API_ENDPOINTS.contractTemplates), {
        method: "POST",
        credentials: "include",
        headers: buildHeaders({}, false),
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al subir la plantilla");
      setName(""); setDescription(""); setFile(null); setFieldMap("");
      notify("success", "Plantilla subida correctamente.");
      onChanged();
    } catch (e: any) {
      notify("error", e.message || "Error al subir la plantilla");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={onClose} title="Plantillas de contrato">
      <div className="space-y-3 mb-5">
        <Field label="Nombre (ej. Contrato Docente 2026)">
          <input className="input input-bordered w-full" value={name}
            onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Descripción (opcional)">
          <input className="input input-bordered w-full" value={description}
            onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Archivo PDF (con campos AcroForm)">
          <input type="file" accept="application/pdf" className="file-input file-input-bordered w-full"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </Field>
        <Field label="Mapeo de campos (JSON) — campo del PDF → dato/token">
          <textarea
            className="textarea textarea-bordered w-full font-mono text-xs h-40"
            placeholder={`{
  "employee_name": "full_name",
  "id_type": "id_type",
  "id_number": "id_number",
  "employee_salary": "salary",
  "day": "@day",
  "month": "@month",
  "year": "@year",
  "signature_city": "=Floridablanca",
  "employee_signature": "to_fill",
  "employee_fingerprint": "to_fill"
}`}
            value={fieldMap}
            onChange={(e) => setFieldMap(e.target.value)}
          />
        </Field>
        <p className="text-xs text-base-content/50">
          Valor de cada campo del PDF:
          <br />• <code>to_fill</code> → el empleado sube una imagen ahí (firma, huella, etc.).
          <br />• una <strong>clave de dato</strong> (ej. <code>full_name</code>, <code>salary</code>, <code>cargo</code>).
          <br />• un <strong>token</strong>: <code>@day</code>, <code>@month</code>, <code>@year</code>, <code>@month_name</code>, <code>@today</code>.
          <br />• un <strong>literal</strong> con <code>=</code> (ej. <code>=Floridablanca</code>).
        </p>
        <div className="flex justify-end">
          <button className="btn btn-primary btn-sm" onClick={upload} disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-xs" /> : "Subir plantilla"}
          </button>
        </div>
      </div>

      <div className="border-t border-base-300 pt-3">
        <h3 className="font-semibold text-base-content mb-2 text-sm">Plantillas existentes</h3>
        {templates.length === 0 ? (
          <p className="text-base-content/50 text-sm">Aún no hay plantillas.</p>
        ) : (
          <ul className="space-y-1">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm p-2 border border-base-300 rounded-lg">
                <span className="truncate">{t.name}</span>
                <button
                  className="btn btn-ghost btn-xs text-error"
                  onClick={() => setConfirmId(t.id)}
                  disabled={deletingId === t.id}
                  title="Eliminar plantilla"
                >
                  {deletingId === t.id ? <span className="loading loading-spinner loading-xs" /> : <Trash2 size={14} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmId != null && (
        <Alert
          isOpen={true}
          onClose={() => setConfirmId(null)}
          onAccept={() => {
            const id = confirmId;
            setConfirmId(null);
            remove(id);
          }}
          title="Eliminar plantilla"
          variant="error"
          acceptText="Eliminar"
          cancelText="Cancelar"
          acceptButtonVariant="destructive"
        >
          <p className="text-base-content/80">
            ¿Eliminar esta plantilla? Esta acción no se puede deshacer.
          </p>
        </Alert>
      )}
    </Overlay>
  );
};

// ----------------------------------------------------------------------------
// UI helpers
// ----------------------------------------------------------------------------
const Overlay = ({
  title, children, onClose, wide = false,
}: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean;
}) => {
  useBodyScrollLock(true);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`bg-base-100 border border-base-300 rounded-lg shadow-2xl w-full ${wide ? "max-w-4xl" : "max-w-2xl"} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-secondary">{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="form-control">
    <label className="label py-1"><span className="label-text text-sm">{label}</span></label>
    {children}
  </div>
);

export default ContratacionAdmin;
