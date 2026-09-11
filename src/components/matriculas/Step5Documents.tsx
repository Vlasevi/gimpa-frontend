// components/matriculas/steps/Step5Documents.tsx
import { useState, useEffect, useRef } from "react";

// Componente reutilizable para subir documentos
const DocumentUpload = ({
  docKey,
  label,
  data,
  update,
  uploadedFiles,
  updateUploadedFiles,
}: any) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Store file in uploadedFiles (separate from formData)
      updateUploadedFiles({ [docKey]: file });
      // Mark as uploaded in formData
      update({ [`${docKey}_uploaded`]: true });
    }
  };

  const handleRemove = () => {
    // Remove from uploadedFiles
    updateUploadedFiles({ [docKey]: null });
    // Mark as not uploaded in formData
    update({ [`${docKey}_uploaded`]: false });
    // Limpiar el input file
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // Check if file exists in uploadedFiles
  const currentFile = uploadedFiles?.[docKey];

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="file-input file-input-bordered file-input-sm w-full"
        onChange={handleFileChange}
      />
      {currentFile && (
        <div className="flex items-center gap-2">
          <span className="text-success text-xs">✓ {currentFile.name}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="btn btn-xs btn-ghost"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export const Step5Documents = ({
  next,
  back,
  data,
  update,
  uploadedFiles,
  updateUploadedFiles,
  enrollmentInfo,
  preloadedDocuments,
  // Valores del paso 3 tal como quedaron al pulsar "Siguiente" (los guarda el padre).
  step3Data,
  nextButtonText = "Siguiente",
  isSubmitting = false,
}: any) => {
  const [replacingDocs, setReplacingDocs] = useState<any>({});
  const [hasDiagnosis, setHasDiagnosis] = useState(false);
  const [showFatherID, setShowFatherID] = useState(false);
  const [showMotherID, setShowMotherID] = useState(false);
  const [guardianType, setGuardianType] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");

  // Determinar grado y tipo de matrícula
  const currentEnrollment = enrollmentInfo?.actual_enrollment;
  const isFirstEnrollment = currentEnrollment?.is_first_enrollment || false;
  const gradeName = currentEnrollment?.grade?.name || "";
  const enrollmentId = currentEnrollment?.id;

  // Leer datos del Step3 para verificar si tiene diagnóstico y con quién vive
  // (antes venían de una copia en localStorage, `enrollment_step3_<id>`).
  useEffect(() => {
    if (!step3Data) return;
    const diagnosis = step3Data.medical_has_diagnosis;

    // Si tiene cualquier diagnóstico diferente a "Ninguno", habilitar el documento
    setHasDiagnosis(Boolean(diagnosis) && diagnosis !== "Ninguno");

    // Obtener el tipo de acudiente (Padre, Madre, Otro, Empresa)
    const guardianTypeValue = step3Data.guardian_type || "";
    setGuardianType(guardianTypeValue);

    // Determinar qué cédulas adicionales se necesitan según con quién vive
    // Solo mostrar cédula del padre si vive con el estudiante Y no es el acudiente
    setShowFatherID(
      Boolean(step3Data.father_lives_with_student) && guardianTypeValue !== "Padre",
    );
    // Solo mostrar cédula de la madre si vive con el estudiante Y no es la acudiente
    setShowMotherID(
      Boolean(step3Data.mother_lives_with_student) && guardianTypeValue !== "Madre",
    );

    // Obtener quién es el responsable para el certificado laboral
    setGuardianRelationship(step3Data.guardian_relationship || "");
  }, [step3Data]);

  // Determinar si es Preescolar (Caminadores a Transición)
  const preescolarGrades = [
    "Caminadores",
    "Párvulos",
    "Pre-Jardín",
    "Jardín",
    "Transición",
  ];
  const isPreescolar = preescolarGrades.some((grade) =>
    gradeName.includes(grade),
  );

  // Definir documentos requeridos según grado y tipo de matrícula
  const getRequiredDocuments = () => {
    let docs = [];

    if (isFirstEnrollment) {
      // Estudiantes NUEVOS
      if (isPreescolar) {
        docs = [
          { key: "registro_civil", label: "Registro Civil" },
          { key: "registro_vacunacion", label: "Registro de vacunación" },
          { key: "cert_eps", label: "Certificado vinculación EPS" },
          { key: "cert_medico", label: "Certificado médico" },
          { key: "cert_vista", label: "Certificado Vista" },
          { key: "cert_auditivo", label: "Certificado Auditivo" },
        ];
      } else {
        // Primaria/Bachillerato
        docs = [
          {
            key: "registro_civil_ti",
            label: "Registro civil y/o tarjeta de identidad",
          },
          { key: "cert_eps", label: "Certificado vinculación EPS" },
          { key: "cert_medico", label: "Certificado médico" },
          { key: "cert_vista", label: "Certificado Vista" },
          { key: "paz_salvo", label: "Paz y salvo (colegio anterior)" },
          {
            key: "convivencia",
            label: "Convivencia escolar (colegio anterior)",
          },
          {
            key: "ficha_psicologica",
            label: "Ficha psicológica (colegio anterior)",
          },
          {
            key: "cert_estudios",
            label: "Certificado de estudios y notas años anteriores",
          },
          { key: "retiro_simat", label: "Constancia retiro SIMAT" },
        ];
      }
    } else {
      // Estudiantes ANTIGUOS (renovación)
      if (isPreescolar) {
        docs = [
          { key: "registro_civil", label: "Registro Civil" },
          { key: "registro_vacunacion", label: "Registro de vacunación" },
          { key: "cert_eps", label: "Certificado vinculación EPS" },
          { key: "cert_medico", label: "Certificado médico" },
          { key: "cert_vista", label: "Certificado Vista" },
          { key: "cert_auditivo", label: "Certificado Auditivo" },
        ];
      } else {
        // Primaria/Bachillerato
        docs = [
          {
            key: "registro_civil_ti",
            label: "Registro civil y/o tarjeta de identidad",
          },
          { key: "cert_eps", label: "Certificado vinculación EPS" },
          { key: "cert_medico", label: "Certificado médico" },
          { key: "cert_vista", label: "Certificado Vista" },
        ];
      }
    }

    // Agregar certificado de diagnóstico si el estudiante tiene algún diagnóstico
    if (hasDiagnosis) {
      docs.push({
        key: "cert_diagnostico",
        label: "Certificado de diagnóstico médico",
      });
    }

    // Siempre se requiere la cédula del Acudiente
    // El label cambia según quién sea el acudiente
    let guardianIdLabel = "Cédula del Acudiente";
    let guardianIdKey = "guardian_id";
    if (guardianType === "Padre") {
      guardianIdLabel = "Cédula del Padre (Acudiente)";
      guardianIdKey = "father_id";
    } else if (guardianType === "Madre") {
      guardianIdLabel = "Cédula de la Madre (Acudiente)";
      guardianIdKey = "mother_id";
    } else if (guardianType === "Empresa") {
      guardianIdLabel = "NIT / Documento de la Empresa (Acudiente)";
      guardianIdKey = "guardian_id";
    }

    docs.push({
      key: guardianIdKey,
      label: guardianIdLabel,
    });

    // Agregar cédulas adicionales de padres que viven con el estudiante
    // (solo si no son el acudiente, para evitar duplicados)
    if (showFatherID) {
      docs.push({
        key: "father_id",
        label: "Cédula del Padre",
      });
    }

    if (showMotherID) {
      docs.push({
        key: "mother_id",
        label: "Cédula de la Madre",
      });
    }

    // Agregar certificado laboral del responsable económico (según guardian_relationship)
    if (guardianRelationship) {
      let workCertLabel = "Certificado laboral";
      if (guardianRelationship === "Padre") {
        workCertLabel = "Certificado laboral del Padre";
      } else if (guardianRelationship === "Madre") {
        workCertLabel = "Certificado laboral de la Madre";
      } else {
        workCertLabel = `Certificado laboral del Acudiente (${guardianRelationship})`;
      }

      docs.push({
        key: "work_certificate",
        label: workCertLabel,
      });
    }

    return docs;
  };

  const requiredDocuments = getRequiredDocuments();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-secondary">
        Documentos Requeridos
      </h2>

      {/* Información del tipo de matrícula */}
      <div className="alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h3 className="font-bold">
            {isFirstEnrollment ? "Estudiante Nuevo" : "Renovación de Matrícula"}
          </h3>
          <div className="text-xs">
            Grado: {gradeName} (
            {isPreescolar ? "Preescolar" : "Primaria/Bachillerato"})
          </div>
        </div>
      </div>

      {/* Alerta adicional si tiene diagnóstico */}
      {hasDiagnosis && (
        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Certificado de diagnóstico requerido</h3>
            <div className="text-xs">
              Se ha detectado que el estudiante tiene un diagnóstico registrado.
              Es necesario subir el certificado médico correspondiente.
            </div>
          </div>
        </div>
      )}

      {/* Sección de Documentos Requeridos */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Sube los documentos requeridos para completar tu matrícula. Los
          documentos existentes se muestran a continuación.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requiredDocuments.map((doc) => (
            <div key={doc.key} className="card bg-base-100 border shadow-sm">
              <div className="card-body p-4">
                <h4 className="font-semibold text-sm mb-2">{doc.label}</h4>

                {/* Mostrar documento existente (solo lectura) */}
                {preloadedDocuments?.[doc.key] && !replacingDocs[doc.key] ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-success/10 rounded">
                      <span className="text-success text-xs">
                        ✓ {preloadedDocuments[doc.key].name}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={preloadedDocuments[doc.key].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-xs btn-outline btn-primary"
                      >
                        Ver
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setReplacingDocs({
                            ...replacingDocs,
                            [doc.key]: true,
                          })
                        }
                        className="btn btn-xs btn-outline btn-warning"
                      >
                        Reemplazar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Input para subir nuevo documento */}
                    <DocumentUpload
                      docKey={doc.key}
                      label={doc.label}
                      data={data}
                      update={update}
                      uploadedFiles={uploadedFiles}
                      updateUploadedFiles={updateUploadedFiles}
                    />
                    {replacingDocs[doc.key] && (
                      <button
                        type="button"
                        onClick={() =>
                          setReplacingDocs({
                            ...replacingDocs,
                            [doc.key]: false,
                          })
                        }
                        className="btn btn-xs btn-ghost mt-2"
                      >
                        Cancelar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="flex justify-between mt-8">
        <button
          className="btn btn-ghost"
          onClick={back}
          disabled={isSubmitting}
        >
          Atrás
        </button>
        <button
          className="btn btn-primary"
          onClick={next}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            nextButtonText
          )}
        </button>
      </div>
    </div>
  );
};
