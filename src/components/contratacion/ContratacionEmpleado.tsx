// components/contratacion/ContratacionEmpleado.tsx
import { useState, useEffect } from "react";
import { ChevronDown, Camera, Loader2 } from "lucide-react";
import { apiUrl, API_ENDPOINTS, apiFetch, buildHeaders } from "@/utils/api";
import { useAuth } from "@/components/Login/loginLogic";
import { PdfModal, embedImagesInPdf, type FieldOverlay } from "@/components/pdf/PdfSignViewer";
import { OtpInput } from "@/components/ui/OtpInput";
import { LoadingState } from "@/components/ui/LoadingState";
import { FieldWidget } from "./FieldWidget";
import {
  DATA_FIELDS,
  DATA_SECTIONS,
  CONTRACT_DOCUMENTS,
  REQUIRED_EMPLOYEE_DOCS,
  STATUS_LABELS,
  computeFullName,
  computeAge,
  CONTRACT_DEFAULTS,
} from "./contractConfig";

interface Contract {
  id: number;
  year: number;
  status: string;
  is_editable: boolean;
  end_date?: string | null;
  data: Record<string, any> | null;
  documents_metadata: Record<string, any> | null;
  correction_comment?: string | null;
  position?: { id: number; name: string } | null;
  subcargo?: string | null;
}

type ImageField = { page: number; x: number; y: number; w: number; h: number; type: string };

const base64ToUint8Array = (b64: string) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const SLOT_LABELS: Record<string, string> = {
  signature: "Firma",
  fingerprint: "Huella",
  photo: "Foto",
  image: "Imagen",
};

// Tarjeta de sección colapsable (mismo estilo que la matrícula del estudiante)
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-base-100 rounded-lg shadow-sm border border-base-300 transition-all duration-200 hover:shadow-md">
      <button
        type="button"
        className="w-full px-6 py-4 flex justify-between items-center bg-base-200 hover:bg-base-200/70 transition-colors rounded-t-lg"
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-lg font-bold text-primary uppercase tracking-wide flex items-center gap-2">
          {title}
        </h3>
        <ChevronDown className={`h-5 w-5 text-base-content/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`border-t border-base-300 transition-all duration-300 ease-in-out ${open ? "max-h-[5000px] opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"}`}>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const ContratacionEmpleado = () => {
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [documents, setDocuments] = useState<Record<string, any>>({});

  const next = () => setCurrentStep((s) => s + 1);
  const back = () => setCurrentStep((s) => s - 1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`${API_ENDPOINTS.contracts}?mine=true`), { credentials: "include" });
        if (res.ok) {
          const list: Contract[] = await res.json();
          const editable = list.find((c) => c.status === "ENABLED" || c.status === "PENDING");
          const chosen = editable || list[0] || null;
          setContract(chosen);
          setFormData(chosen?.data || {});
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingState label="Cargando contrato…" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="bg-base-100 rounded-lg border border-base-300 shadow-sm p-8 text-center">
          <h2 className="font-display text-xl font-bold text-secondary mb-2">Sin contratación activa</h2>
          <p className="text-base-content/70">
            Aún no tienes una contratación habilitada. Cuando administración la habilite,
            podrás completarla aquí.
          </p>
        </div>
      </div>
    );
  }

  if (!contract.is_editable) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="bg-base-100 rounded-lg border border-base-300 shadow-sm p-8 text-center">
          <h2 className="font-display text-xl font-bold text-secondary mb-2">
            Contratación {STATUS_LABELS[contract.status] || contract.status}
          </h2>
          <p className="text-base-content/70">
            Tu contratación está en estado{" "}
            <strong>{STATUS_LABELS[contract.status] || contract.status}</strong>.
            {contract.status === "IN_REVIEW" && " Espera la revisión de administración."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <ul className="steps steps-horizontal w-full mb-8">
          <li className={`step ${currentStep >= 1 ? "step-primary" : ""}`}>Verificación</li>
          <li className={`step ${currentStep >= 2 ? "step-primary" : ""}`}>Datos</li>
          <li className={`step ${currentStep >= 3 ? "step-primary" : ""}`}>Documentos</li>
          <li className={`step ${currentStep >= 4 ? "step-primary" : ""}`}>Firma</li>
        </ul>

        {contract.correction_comment && (
          <div className="alert alert-warning mb-4">
            <span><strong>Corrección solicitada:</strong> {contract.correction_comment}</span>
          </div>
        )}

        <div className="bg-base-100 rounded-lg border border-base-300 shadow-sm p-6">
          {currentStep === 1 && <StepOTP next={next} />}
          {currentStep === 2 && (
            <StepData next={next} contractId={contract.id} formData={formData} setFormData={setFormData} />
          )}
          {currentStep === 3 && (
            <StepDocuments
              next={next}
              back={back}
              contractId={contract.id}
              hasEndDate={Boolean(contract.end_date)}
              documents={documents}
              setDocuments={setDocuments}
            />
          )}
          {currentStep === 4 && (
            <StepSign back={back} contractId={contract.id} formData={formData} />
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 1: OTP
// ----------------------------------------------------------------------------
const StepOTP = ({ next }: { next: () => void }) => {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const request = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl(API_ENDPOINTS.contractRequestOtp), {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
      });
      if (res.ok) setSent(true);
      else setError((await res.json()).error || "Error al enviar el código");
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  // `codeOverride`: ver el comentario equivalente en Step1Verification.tsx —
  // `OtpInput.onComplete` manda el valor recién completado en vez de depender del
  // estado `code`, que al pegar el código todavía no se actualizó en este punto.
  const validate = async (codeOverride?: string) => {
    const otpCode = codeOverride ?? code;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl(API_ENDPOINTS.contractValidateOtp), {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json();
      if (res.ok && data.valid) next();
      else setError(data.message || "Código incorrecto");
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-secondary mb-4">Verificación de Identidad</h2>
      <p className="text-base-content/60">
        Enviaremos un código de verificación a tu correo para iniciar tu contratación.
      </p>
      {!sent && error && <div className="alert alert-error"><span>{error}</span></div>}
      {!sent ? (
        <button className="btn btn-primary" onClick={request} disabled={loading}>
          {loading ? <span className="loading loading-spinner" /> : "Enviar Código"}
        </button>
      ) : (
        // `w-fit` en vez de `w-full max-w-xs`: ver Step1Verification.tsx (misma
        // instancia unificada) — el ancho real de las casillas del OTP es menor que el
        // de la tarjeta, así que con `w-full` el botón y el link de reenviar quedaban
        // más anchos que las casillas.
        <div className="mx-auto flex w-fit flex-col">
          <div className="mb-4">
            <OtpInput
              label="Código recibido"
              value={code}
              onChange={setCode}
              disabled={loading}
              onComplete={validate}
              error={error || undefined}
            />
          </div>
          <button className="btn btn-secondary w-full mb-2" onClick={() => validate()} disabled={loading || code.length !== 6}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Validar y Continuar"}
          </button>
          <p className="text-center text-sm text-base-content/60">
            ¿No recibiste el código?{" "}
            <button
              type="button"
              onClick={request}
              disabled={loading}
              className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline disabled:cursor-not-allowed disabled:text-base-content/40 disabled:no-underline"
            >
              Reenviar
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 2: Datos
// ----------------------------------------------------------------------------
const NAME_PARTS = ["first_name1", "first_name2", "last_name1", "last_name2"];

const StepData = ({
  next,
  contractId,
  formData,
  setFormData,
}: {
  next: () => void;
  contractId: number;
  formData: Record<string, any>;
  setFormData: (d: Record<string, any>) => void;
}) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fields = DATA_FIELDS.filter((f) => !f.adminOnly);
  const readOnlyFields = DATA_FIELDS.filter((f) => f.adminOnly && f.employeeView);

  // Auto-relleno: correo institucional (cuenta), ARL, banco; y foto existente.
  useEffect(() => {
    setFormData({
      ...formData,
      institutional_email: user?.email || formData.institutional_email || "",
      arl: CONTRACT_DEFAULTS.arl,
      bank: CONTRACT_DEFAULTS.bank,
      account_type: formData.account_type || CONTRACT_DEFAULTS.accountType,
      full_name: computeFullName(formData),
      age: computeAge(formData.birth_date),
    });
    (async () => {
      try {
        const res = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contractId)), {
          credentials: "include", headers: buildHeaders(),
        });
        if (res.ok) setPhotoUrl((await res.json()).documents?.profile_photo?.url || null);
      } catch { /* noop */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (key: string, value: string) => {
    const nextData = { ...formData, [key]: value };
    if (NAME_PARTS.includes(key)) nextData.full_name = computeFullName(nextData);
    if (key === "birth_date") nextData.age = computeAge(value);
    setFormData(nextData);
  };

  const displayValue = (f: typeof fields[number]) => {
    if (f.key === "full_name") return computeFullName(formData);
    if (f.key === "age") return computeAge(formData.birth_date);
    if (f.auto === "institutional_email") return user?.email || "";
    if (f.auto === "arl") return CONTRACT_DEFAULTS.arl;
    if (f.auto === "bank") return CONTRACT_DEFAULTS.bank;
    return formData[f.key] ?? "";
  };

  // Ciudad: desplegable solo si el departamento asociado es "Atlántico"; si no, texto libre.
  const effectiveField = (f: typeof fields[number]) =>
    f.cityOf && formData[f.cityOf] !== "Atlántico"
      ? { ...f, widget: "text" as const, options: undefined }
      : f;

  const uploadPhoto = async (file?: File | null) => {
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("profile_photo", file);
      const res = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contractId)), {
        method: "POST", credentials: "include", headers: buildHeaders({}, false), body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error subiendo foto");
      const ref = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contractId)), {
        credentials: "include", headers: buildHeaders(),
      });
      if (ref.ok) setPhotoUrl((await ref.json()).documents?.profile_photo?.url || null);
    } catch (e: any) {
      setError(e.message || "Error subiendo foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(API_ENDPOINTS.contractById(contractId), {
        method: "PATCH",
        body: JSON.stringify({ data: formData }),
      });
      if (!res.ok) throw new Error("Error guardando datos");
      next();
    } catch (e: any) {
      setError(e.message || "Error guardando datos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-secondary">Datos del Empleado</h2>
      {error && <div className="alert alert-error"><span>{error}</span></div>}

      {/* Foto de perfil (se sube aquí, en los datos) */}
      <SectionCard title="Foto de Perfil">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-base-300 overflow-hidden flex items-center justify-center bg-base-100 shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-base-content/30" />
            )}
          </div>
          <div>
            <label className="btn btn-sm btn-outline btn-primary cursor-pointer gap-2">
              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {photoUrl ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { uploadPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <p className="text-xs text-base-content/40 mt-1">Obligatoria para firmar el contrato.</p>
          </div>
        </div>
      </SectionCard>

      {DATA_SECTIONS.filter((s) => s.id !== "nomina").map((section) => {
        const sectionFields = fields.filter((f) => f.section === section.id);
        if (sectionFields.length === 0) return null;
        return (
          <SectionCard key={section.id} title={section.label}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionFields.map((f) => (
                <div key={f.key} className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium text-base-content/60">{f.label}</span>
                  </label>
                  <FieldWidget field={effectiveField(f)} value={displayValue(f)} onChange={(v) => onChange(f.key, v)} />
                </div>
              ))}
            </div>
          </SectionCard>
        );
      })}

      {readOnlyFields.length > 0 && (
        <SectionCard title="Nómina (solo lectura)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readOnlyFields.map((f) => (
              <div key={f.key} className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium text-base-content/60">{f.label}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full bg-base-200 text-base-content/50 cursor-not-allowed"
                  value={formData[f.key] ?? ""}
                  disabled
                  readOnly
                />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="flex justify-end mt-2">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="loading loading-spinner loading-sm" /> : "Guardar y Continuar"}
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 3: Documentos
// ----------------------------------------------------------------------------
const StepDocuments = ({
  next,
  back,
  contractId,
  hasEndDate,
  documents,
  setDocuments,
}: {
  next: () => void;
  back: () => void;
  contractId: number;
  hasEndDate: boolean;
  documents: Record<string, any>;
  setDocuments: (d: Record<string, any>) => void;
}) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  // El egreso (requiresEndDate) solo aplica a contratos a término fijo; en indefinidos se oculta.
  const docs = CONTRACT_DOCUMENTS.filter(
    (d) => d.employeeUpload && (!d.requiresEndDate || hasEndDate),
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contractId)), {
          credentials: "include",
          headers: buildHeaders(),
        });
        if (res.ok) setDocuments((await res.json()).documents || {});
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [contractId, setDocuments]);

  const upload = async (key: string, file?: File | null) => {
    if (!file) return;
    setUploading(key);
    setError("");
    try {
      const fd = new FormData();
      fd.append(key, file);
      const res = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contractId)), {
        method: "POST",
        credentials: "include",
        headers: buildHeaders({}, false),
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al subir");
      const ref = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contractId)), {
        credentials: "include",
        headers: buildHeaders(),
      });
      if (ref.ok) setDocuments((await ref.json()).documents || {});
    } catch (e: any) {
      setError(e.message || "Error al subir documento");
    } finally {
      setUploading(null);
    }
  };

  const missingRequired = REQUIRED_EMPLOYEE_DOCS.filter((k) => !documents[k]);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-secondary">Documentos Requeridos</h2>
      <p className="text-sm text-base-content/60">
        Sube los documentos en PDF/imagen. Los marcados con <span className="text-error">*</span> son obligatorios.
      </p>
      {error && <div className="alert alert-error"><span>{error}</span></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((d) => {
          const uploaded = Boolean(documents[d.key]);
          return (
            <div key={d.key} className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body p-4">
                <h4 className="font-semibold text-sm mb-2">
                  {d.label} {d.required && <span className="text-error">*</span>}
                </h4>
                {uploading === d.key ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-primary">
                    <span className="loading loading-spinner loading-sm" /> Subiendo documento...
                  </div>
                ) : uploaded ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-success/10 rounded">
                      <span className="text-success text-xs">✓ Documento subido</span>
                    </div>
                    <label className="btn btn-xs btn-outline btn-warning cursor-pointer">
                      Reemplazar
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={(e) => { upload(d.key, e.target.files?.[0]); e.target.value = ""; }} />
                    </label>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="file-input file-input-bordered file-input-sm w-full"
                    onChange={(e) => { upload(d.key, e.target.files?.[0]); e.target.value = ""; }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={back}>Atrás</button>
        <button
          className="btn btn-primary"
          onClick={next}
          disabled={missingRequired.length > 0}
          title={missingRequired.length > 0 ? "Faltan documentos obligatorios" : ""}
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 4: Firma — mismo visor con overlays que la matrícula del estudiante
// ----------------------------------------------------------------------------
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

const StepSign = ({
  back,
  contractId,
  formData,
}: {
  back: () => void;
  contractId: number;
  formData: Record<string, any>;
}) => {
  const [generating, setGenerating] = useState(true);
  const [unsigned, setUnsigned] = useState<Uint8Array | null>(null);
  const [imageFields, setImageFields] = useState<Record<string, ImageField>>({});
  const [slotImages, setSlotImages] = useState<Record<string, { file: File; preview: string }>>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const gen = async () => {
      setGenerating(true);
      setError("");
      try {
        const res = await apiFetch(API_ENDPOINTS.contractGenerateUnsigned(contractId), {
          method: "POST",
          body: JSON.stringify({ data: formData }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Error generando el contrato");
        const data = await res.json();
        setUnsigned(base64ToUint8Array(data.contrato));
        setImageFields(data.imageFields || {});
      } catch (e: any) {
        setError(e.message || "Error generando el contrato");
      } finally {
        setGenerating(false);
      }
    };
    gen();
  }, [contractId, formData]);

  const handleSelect = (field: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setSlotImages((prev) => ({ ...prev, [field]: { file, preview } }));
  };
  const handleClear = (field: string) => {
    setSlotImages((prev) => {
      const cur = prev[field];
      if (cur?.preview) URL.revokeObjectURL(cur.preview);
      const n = { ...prev };
      delete n[field];
      return n;
    });
  };

  const slotKeys = Object.keys(imageFields);
  const filled = slotKeys.filter((k) => slotImages[k]).length;
  const total = slotKeys.length;
  const allFilled = total === 0 || filled === total;

  // Overlays interactivos para el visor (igual que en la matrícula)
  const overlays: FieldOverlay[] = slotKeys.map((field) => {
    const rect = imageFields[field];
    return {
      fieldName: field,
      label: SLOT_LABELS[rect.type] || "Imagen",
      rect: { page: rect.page, x: rect.x, y: rect.y, w: rect.w, h: rect.h },
      preview: slotImages[field]?.preview ?? null,
      onSelect: (file: File) => handleSelect(field, file),
      onClear: () => handleClear(field),
    };
  });

  const signAndSubmit = async () => {
    if (!unsigned) return;
    if (total > 0 && !allFilled) {
      setError("Sube la firma/huella en todos los campos resaltados del documento.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const images: { fieldName: string; dataUrl: string }[] = [];
      for (const field of slotKeys) {
        const s = slotImages[field];
        if (s) images.push({ fieldName: field, dataUrl: await fileToDataUrl(s.file) });
      }
      const signed = await embedImagesInPdf(unsigned, images, imageFields as any);

      const fd = new FormData();
      fd.append(
        "contrato_firmado",
        new Blob([signed as BlobPart], { type: "application/pdf" }),
        "contrato_firmado.pdf",
      );
      const upRes = await fetch(apiUrl(API_ENDPOINTS.contractDocuments(contractId)), {
        method: "POST",
        credentials: "include",
        headers: buildHeaders({}, false),
        body: fd,
      });
      if (!upRes.ok) throw new Error((await upRes.json()).error || "Error subiendo el contrato firmado");

      const subRes = await apiFetch(API_ENDPOINTS.contractSubmit(contractId), { method: "POST" });
      if (!subRes.ok) throw new Error((await subRes.json()).error || "Error al enviar la contratación");
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Error al firmar/enviar");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-10">
        <h2 className="font-display text-2xl font-bold text-success mb-2">¡Contratación enviada!</h2>
        <p className="text-base-content/70">
          Tu contrato firmado fue enviado a revisión. Recibirás una notificación cuando sea aprobado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-secondary">Firma del Contrato</h2>
      <p className="text-sm text-base-content/60">
        Abre el documento y haz clic en los campos resaltados para subir tu firma y huella
        directamente sobre el PDF.
      </p>
      {error && <div className="alert alert-error"><span>{error}</span></div>}

      {generating ? (
        <LoadingState compact className="py-10" label="Generando contrato…" />
      ) : (
        <>
          {/* Progreso */}
          {total > 0 && (
            <div className="flex items-center gap-3">
              <progress className="progress progress-primary flex-1" value={filled} max={total} />
              <span className="text-xs text-base-content/50 shrink-0">{filled}/{total} campos</span>
            </div>
          )}

          {/* Tarjeta del documento */}
          <div className="card border bg-base-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="card-body p-4 flex-row items-center gap-4">
              <div className="bg-error/10 text-error font-bold text-sm rounded-lg px-3 py-2 shrink-0">PDF</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Contrato</p>
                <p className="text-xs text-base-content/40">Haz clic en los campos resaltados para firmar</p>
              </div>
              <button
                className="btn btn-sm btn-outline btn-primary shrink-0"
                onClick={() => setOpen(true)}
                disabled={!unsigned}
              >
                {unsigned ? "Ver y firmar" : <span className="loading loading-spinner loading-xs" />}
              </button>
            </div>
          </div>

          {/* Navegación */}
          <div className="flex justify-between mt-4">
            <button className="btn btn-ghost" onClick={back} disabled={submitting}>Atrás</button>
            <button className="btn btn-primary" onClick={signAndSubmit} disabled={submitting || !allFilled}>
              {submitting ? <span className="loading loading-spinner loading-sm" /> : "Firmar y Enviar"}
            </button>
          </div>

          {/* Visor PDF con overlays interactivos */}
          {open && unsigned && (
            <PdfModal
              pdfData={unsigned}
              title="Contrato"
              onClose={() => setOpen(false)}
              overlays={overlays}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ContratacionEmpleado;
