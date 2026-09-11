// components/matriculas/steps/Step6Confirmation.tsx
import { useState } from "react";
import { apiUrl, API_ENDPOINTS, buildHeaders } from "@/utils/api";

export const Step6Confirmation = ({
  back,
  data,
  // Valores del paso 3 tal como quedaron al pulsar "Siguiente" (los guarda el padre).
  step3Data,
  uploadedFiles,
  enrollmentInfo,
}: any) => {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasDiagnosis, setHasDiagnosis] = useState(false);

  const handleFinalSubmit = async () => {
    const enrollmentId = enrollmentInfo?.actual_enrollment?.id;

    if (!enrollmentId) {
      alert("No se encontró la matrícula");
      return;
    }

    setSending(true);

    try {
      // ---------- PASO 1: Enviar datos de Step3 (user_data) ----------
      // Antes venían de una copia en localStorage (`enrollment_step3_<id>`). Respaldo:
      // `data` (el estado del wizard), que es un superconjunto de lo del paso 3 — mejor
      // eso que mandar `user_data: {}` y borrar los datos del estudiante.
      const step3Values = step3Data ?? data;

      // Verificar si tiene diagnóstico y extraer información de convivencia
      let studentHasDiagnosis = false;
      let showFatherID = false;
      let showMotherID = false;
      let showGuardianID = false;
      let guardianRelationship = "";
      let studentData: any = {};

      if (step3Values) {
        studentData = step3Values;
        const diagnosis = studentData.medical_has_diagnosis;
        studentHasDiagnosis = diagnosis && diagnosis !== "Ninguno";
        setHasDiagnosis(studentHasDiagnosis);

        // Extraer información de convivencia para documentos adicionales
        showFatherID = studentData.father_lives_with_student || false;
        showMotherID = studentData.mother_lives_with_student || false;
        showGuardianID = studentData.lives_with_other || false;
        guardianRelationship = studentData.guardian_relationship || "";
      }

      // ---------- PASO 2: Subir firma y documentos (Step4) ----------
      // Determinar si es primera matrícula y si es preescolar
      const actualEnrollment = enrollmentInfo?.actual_enrollment;
      const isFirstEnrollment = actualEnrollment?.is_first_enrollment || false;
      const gradeName = actualEnrollment?.grade?.name || "";

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
        if (studentHasDiagnosis) {
          docs.push({
            key: "cert_diagnostico",
            label: "Certificado de diagnóstico médico",
          });
        }

        // Agregar cédulas de padres/acudiente según con quién vive el estudiante
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

        if (showGuardianID) {
          docs.push({
            key: "guardian_id",
            label: "Cédula del Acudiente",
          });
        }

        // Agregar certificado laboral del responsable económico (según guardian_relationship)
        if (guardianRelationship) {
          docs.push({
            key: "work_certificate",
            label: "Certificado laboral del responsable",
          });
        }

        return docs;
      };

      const requiredDocuments = getRequiredDocuments();

      // Construir FormData con TODOS los archivos de uploadedFiles
      const formData = new FormData();

      // Fotos de perfil (Step3) - desde uploadedFiles
      if (uploadedFiles?.student_photo instanceof File) {
        formData.append("student_photo", uploadedFiles.student_photo);
      }
      if (uploadedFiles?.father_photo instanceof File) {
        formData.append("father_photo", uploadedFiles.father_photo);
      }
      if (uploadedFiles?.mother_photo instanceof File) {
        formData.append("mother_photo", uploadedFiles.mother_photo);
      }

      // PDFs firmados (Step4) - desde uploadedFiles
      if (uploadedFiles?.contrato_signed instanceof File) {
        formData.append("contrato_signed", uploadedFiles.contrato_signed);
      }
      if (uploadedFiles?.pagare_signed instanceof File) {
        formData.append("pagare_signed", uploadedFiles.pagare_signed);
      }
      if (uploadedFiles?.hoja_matricula_signed instanceof File) {
        formData.append(
          "hoja_matricula_signed",
          uploadedFiles.hoja_matricula_signed,
        );
      }

      // Documentos requeridos (Step5) - desde uploadedFiles
      console.log(
        "Documentos requeridos a enviar:",
        requiredDocuments.map((d) => d.key),
      );
      console.log(
        "Archivos disponibles en uploadedFiles:",
        Object.keys(uploadedFiles),
      );

      requiredDocuments.forEach((doc) => {
        const file = uploadedFiles?.[doc.key];
        if (file instanceof File) {
          console.log(`Agregando documento: ${doc.key} (${file.name})`);
          formData.append(doc.key, file);
        } else {
          console.log(`Documento ${doc.key} no encontrado en uploadedFiles`);
        }
      });

      // Verificar si hay archivos
      const hasFiles = Array.from(formData.keys()).length > 0;

      if (hasFiles) {
        console.log("Subiendo firma y documentos de matrícula...");

        const docsResponse = await fetch(
          apiUrl(API_ENDPOINTS.enrollmentDocuments(enrollmentId)),
          {
            method: "POST",
            headers: buildHeaders({}, false), // false = no incluir Content-Type para FormData
            body: formData,
            credentials: "include",
          },
        );

        if (!docsResponse.ok) {
          const error = await docsResponse.json();
          alert(
            `Error al subir documentos: ${error.error || "Error desconocido"}`,
          );
          setSending(false);
          return;
        }

        console.log("Documentos subidos correctamente");
      } else {
        console.log("No hay documentos nuevos que subir, continuando...");
      }

      // ---------- PASO 3: Enviar matrícula a revisión (UNIFICADO) ----------
      console.log("Enviando matrícula a revisión...");
      const response = await fetch(
        apiUrl(API_ENDPOINTS.enrollmentById(enrollmentId)),
        {
          method: "PATCH",
          headers: buildHeaders(),
          body: JSON.stringify({ user_data: studentData }),
          credentials: "include",
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Matrícula enviada:", result);
        setSuccess(true);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "No se pudo enviar la matrícula"}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al enviar la matrícula. Verifica tu conexión.");
    } finally {
      setSending(false);
    }
  };

  // Modal de éxito
  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-8 max-w-lg mx-auto px-4">
          {/* Ícono de éxito */}
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Mensaje principal */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-800">
              Matrícula enviada exitosamente
            </h2>
            <p className="text-gray-500">
              Tu solicitud ha sido recibida y está en proceso de revisión. Te
              notificaremos cuando sea aprobada.
            </p>
          </div>

          {/* Botón */}
          <button
            className="btn btn-primary btn-wide"
            onClick={() => (window.location.href = "/matriculas")}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Datos para el resumen (grado sugerido / año objetivo)
  const suggestedGrade =
    enrollmentInfo?.suggested_enrollment?.grade?.description ||
    enrollmentInfo?.actual_enrollment?.grade?.name ||
    "N/A";
  const targetYear =
    enrollmentInfo?.suggested_enrollment?.academic_year || "N/A";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary text-center">
        Resumen de Matrícula
      </h2>

      <div className="bg-gray-50 p-6 rounded-lg space-y-4 text-sm">
        <div className="grid grid-cols-2 border-b pb-2">
          <span className="font-bold text-gray-600">Grado a Cursar:</span>
          <span>
            {suggestedGrade} {targetYear !== "N/A" ? `(${targetYear})` : ""}
          </span>
        </div>
        <div className="grid grid-cols-2 border-b pb-2">
          <span className="font-bold text-gray-600">Estudiante:</span>
          <span>
            {data.student_firstname1} {data.student_lastname1}
          </span>
        </div>
        <div className="grid grid-cols-2 border-b pb-2">
          <span className="font-bold text-gray-600">Dirección:</span>
          <span>{data.residence_address}</span>
        </div>
        <div className="grid grid-cols-2 border-b pb-2">
          <span className="font-bold text-gray-600">Documentos:</span>
          <span className="text-success font-semibold">
            Firmados y en verificación
          </span>
        </div>
      </div>

      <div className="alert alert-warning shadow-lg">
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
        <span>
          Al hacer clic en Confirmar, aceptas legalmente el pagaré y el contrato
          de servicios educativos y tus datos serán enviados a revisión.
        </span>
      </div>

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={back} disabled={sending}>
          Volver
        </button>
        <button
          className="btn btn-success text-white w-1/2"
          onClick={handleFinalSubmit}
          disabled={sending}
        >
          {sending ? (
            <>
              <span className="loading loading-spinner"></span>
              Enviando matrícula...
            </>
          ) : (
            "Confirmar y Enviar Matrícula"
          )}
        </button>
      </div>
    </div>
  );
};
