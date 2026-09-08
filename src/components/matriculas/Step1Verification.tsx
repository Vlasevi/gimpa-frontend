// components/matriculas/steps/Step1Verification.tsx
import { useState } from "react";
import { apiUrl, API_ENDPOINTS, buildHeaders } from "@/utils/api";
import { OtpInput } from "@/components/ui/OtpInput";

export const Step1Verification = ({
  next,
  userEmail,
  onEnrollmentInfoLoaded,
  onDocumentsLoaded,
}: {
  next: () => void;
  userEmail: any;
  onEnrollmentInfoLoaded: (info: any) => void;
  onDocumentsLoaded: (docs: any) => void;
}) => {
  const [tokenSent, setTokenSent] = useState(false);
  const [inputToken, setInputToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");

  const handleRequestToken = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl(API_ENDPOINTS.requestOtp), {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
      });

      if (response.ok) {
        setTokenSent(true);
        console.log("📧 Código enviado al correo");
      } else {
        const data = await response.json();
        setError(data.message || "Error al enviar el código");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleValidateToken = async () => {
    setLoading(true);
    setLoadingMessage("Validando...");
    setError("");

    try {
      // 1. Validate OTP
      const response = await fetch(apiUrl(API_ENDPOINTS.validateOtp), {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify({ code: inputToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.message || "Código incorrecto");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      console.log("✅ Código validado correctamente");

      // 2. Load enrollment info
      setLoadingMessage("Cargando información...");

      const enrollmentResponse = await fetch(
        apiUrl(API_ENDPOINTS.enrollments),
        { credentials: "include" }
      );

      if (!enrollmentResponse.ok) {
        setError("Error al cargar información de matrícula");
        setLoading(false);
        setLoadingMessage("");
        return;
      }

      const enrollmentData = await enrollmentResponse.json();
      onEnrollmentInfoLoaded(enrollmentData);
      console.log("📋 Información de matrícula cargada");

      // 3. Load documents if enrollment exists
      const enrollmentId = enrollmentData?.actual_enrollment?.id;

      if (enrollmentId) {
        setLoadingMessage("Cargando documentos...");

        try {
          const docsResponse = await fetch(
            apiUrl(API_ENDPOINTS.enrollmentDocuments(enrollmentId)),
            { credentials: "include" }
          );

          if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            const docs = docsData.documents || {};

            // Transform documents for Step3/Step4 compatibility
            // Backend returns { url, uploaded_at } but Steps expect { preview_base64 }
            const transformedDocs: Record<string, any> = {};
            for (const [key, value] of Object.entries(docs)) {
              if (value && typeof value === 'object') {
                const docValue = value as { url?: string; uploaded_at?: string };
                transformedDocs[key] = {
                  ...docValue,
                  preview_base64: docValue.url,  // Use presigned URL as preview
                  name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                };
              }
            }

            // Save ALL documents (photos, signatures, PDFs, etc.)
            onDocumentsLoaded(transformedDocs);
            console.log(
              "📄 Documentos cargados:",
              Object.keys(transformedDocs).filter((k) => transformedDocs[k])
            );
          }
        } catch (docError) {
          console.error("Error loading documents:", docError);
          // Continue anyway - documents are optional
        }
      }

      // 4. Advance to next step
      next();
    } catch (error) {
      console.error("Error:", error);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-secondary mb-4">
        Verificación de Identidad
      </h2>
      <p className="text-gray-600">
        Para iniciar la matrícula, necesitamos validar tu identidad. Enviaremos
        un código al correo del acudiente registrado.
      </p>

      {!tokenSent && error && (
        <div className="text-left alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {!tokenSent ? (
        <button
          className="btn btn-primary"
          onClick={handleRequestToken}
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            "Enviar Código"
          )}
        </button>
      ) : (
        /* `w-fit` en vez de `w-full max-w-xs`: el ancho real de las 6 casillas del OTP
           (~264px) es menor que el de la tarjeta (320px) — con `w-full` el botón y el
           link de reenviar quedaban visiblemente más anchos que las casillas. Al ser
           flex-col con `w-fit`, el contenedor se ajusta al hijo más ancho (las
           casillas) y el resto (`items-stretch`, default) se estira a ese mismo ancho,
           sin números mágicos. */
        <div className="mx-auto flex w-fit flex-col animate-fade-in">
          <div className="mb-4">
            <OtpInput
              label="Ingresa el código recibido"
              value={inputToken}
              onChange={setInputToken}
              disabled={loading}
              onComplete={handleValidateToken}
              error={error || undefined}
            />
          </div>

          <button
            className="btn btn-secondary w-full mb-2"
            onClick={handleValidateToken}
            disabled={loading || inputToken.length !== 6}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {loadingMessage}
              </>
            ) : (
              "Validar y Continuar"
            )}
          </button>

          <p className="text-center text-sm text-base-content/60">
            ¿No recibiste el código?{" "}
            <button
              type="button"
              onClick={handleRequestToken}
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
