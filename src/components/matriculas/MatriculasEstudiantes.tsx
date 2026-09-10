// components/matriculas/MatriculasEstudiantes.tsx
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Step1Verification } from "./Step1Verification";
import { Step2GradeSelection } from "./Step2GradeSelection";
import { Step3StudentData } from "./Step3StudentData";
const Step4Documents = lazy(() =>
  import("./Step4Documents").then((m) => ({ default: m.Step4Documents })),
);
import { Step5Documents } from "./Step5Documents";
import { Step6Confirmation } from "./Step6Confirmation";
import { EnrollmentBlockedMessage } from "./EnrollmentBlockedMessage";
import { useAuth } from "@/components/Login/loginLogic";
import { apiUrl, API_ENDPOINTS, apiFetch } from "@/utils/api";
import { LoadingState } from "@/components/ui/LoadingState";

// Tipado de la respuesta del backend (estructura optimizada)
export interface EnrollmentResponse {
  actual_enrollment: {
    id: number;
    grade: {
      id: number;
      name: string;
      description: string;
    };
    academic_year: number;
    status: string;
    is_editable: boolean;
    is_first_enrollment: boolean;
    needs_correction: boolean;
    correction_comment: string | null;
  } | null;
  suggested_enrollment: {
    grade: {
      id: number;
      name: string;
      description: string;
    };
    academic_year: number;
  } | null;
  eligibility: {
    can_enroll: boolean;
    message: string;
    existing_data: Record<string, any>;
  };
}

export const MatriculasEstudiantes = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [enrollmentInfo, setEnrollmentInfo] =
    useState<EnrollmentResponse | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [documents, setDocuments] = useState<any>({}); // Store all preloaded documents
  const [uploadedFiles, setUploadedFiles] = useState<any>({}); // Store new uploaded files separately
  const [loadingEligibility, setLoadingEligibility] = useState(true); // Loading state
  const [unsignedPdfs, setUnsignedPdfs] = useState<{
    contrato: Uint8Array | null;
    pagare: Uint8Array | null;
    hoja_matricula: Uint8Array | null;
    signers: { label: string; key: string }[];
    signatureFields: Record<string, Record<string, { page: number; x: number; y: number; w: number; h: number }>>;
  }>({ contrato: null, pagare: null, hoja_matricula: null, signers: [], signatureFields: {} });
  const [signedPdfs, setSignedPdfs] = useState<{
    contrato: Uint8Array | null;
    pagare: Uint8Array | null;
    hoja_matricula: Uint8Array | null;
  }>({ contrato: null, pagare: null, hoja_matricula: null });
  const [generatingPdfs, setGeneratingPdfs] = useState(false);
  const lastGeneratedHashRef = useRef<string | null>(null);
  const { user } = useAuth();

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const updateFormData = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
  };

  const updateUploadedFiles = (files: any) => {
    setUploadedFiles((prev: any) => ({ ...prev, ...files }));
  };

  const base64ToUint8Array = (b64: string) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const handleStep3Next = async () => {
    const enrollmentId = enrollmentInfo?.actual_enrollment?.id;
    if (!enrollmentId) return;

    const currentHash = JSON.stringify(formData, Object.keys(formData).sort());
    if (
      lastGeneratedHashRef.current === currentHash &&
      unsignedPdfs.contrato !== null
    ) {
      nextStep();
      return;
    }

    setGeneratingPdfs(true);
    try {
      const res = await apiFetch(
        API_ENDPOINTS.enrollmentGenerateUnsigned(enrollmentId),
        {
          method: "POST",
          body: JSON.stringify({ user_data: formData }),
        },
      );
      if (!res.ok) throw new Error("Error generando PDFs");
      const data = await res.json();
      setUnsignedPdfs({
        contrato: base64ToUint8Array(data.contrato),
        pagare: base64ToUint8Array(data.pagare),
        hoja_matricula: base64ToUint8Array(data.hoja_matricula),
        signers: data.signers,
        signatureFields: data.signatureFields,
      });
      setSignedPdfs({ contrato: null, pagare: null, hoja_matricula: null });
      lastGeneratedHashRef.current = currentHash;
      nextStep();
    } catch (e) {
      console.error("Error generando PDFs sin firma:", e);
    } finally {
      setGeneratingPdfs(false);
    }
  };

  // Load eligibility on mount (before OTP)
  useEffect(() => {
    const loadEligibility = async () => {
      setLoadingEligibility(true);
      try {
        const response = await fetch(apiUrl(API_ENDPOINTS.enrollments), {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setEnrollmentInfo(data);
        }
      } catch (error) {
        console.error("Error loading eligibility:", error);
      } finally {
        setLoadingEligibility(false);
      }
    };

    loadEligibility();
  }, []);

  // Use eligibility logic from backend
  const canEnroll = enrollmentInfo?.eligibility?.can_enroll ?? true;
  const eligibilityMessage = enrollmentInfo?.eligibility?.message ?? "";
  const enrollmentStatus = enrollmentInfo?.actual_enrollment?.status;

  return (
    <div className="container mx-auto p-6">
      {/* Loading overlay while generating PDFs */}
      {generatingPdfs && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <LoadingState label="Generando documentos…" />
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        {/* Show loading spinner while checking eligibility */}
        {loadingEligibility ? (
          <LoadingState label="Verificando elegibilidad…" />
        ) : (
          <>
            {/* Show eligibility message if user cannot enroll */}
            {enrollmentInfo && !canEnroll && eligibilityMessage ? (
              <EnrollmentBlockedMessage
                message={eligibilityMessage}
                targetYear={
                  enrollmentInfo.suggested_enrollment?.academic_year ||
                  new Date().getFullYear()
                }
                existingEnrollment={
                  enrollmentInfo.actual_enrollment
                    ? {
                        grade: enrollmentInfo.actual_enrollment.grade,
                        status: enrollmentInfo.actual_enrollment.status,
                      }
                    : undefined
                }
              />
            ) : (
              <>
                {/* Progress Steps */}
                <ul className="steps steps-horizontal w-full mb-8">
                  <li
                    className={`step ${currentStep >= 1 ? "step-primary" : ""}`}
                  >
                    Verificación
                  </li>
                  <li
                    className={`step ${currentStep >= 2 ? "step-primary" : ""}`}
                  >
                    Grado
                  </li>
                  <li
                    className={`step ${currentStep >= 3 ? "step-primary" : ""}`}
                  >
                    Datos
                  </li>
                  <li
                    className={`step ${currentStep >= 4 ? "step-primary" : ""}`}
                  >
                    Firmas
                  </li>
                  <li
                    className={`step ${currentStep >= 5 ? "step-primary" : ""}`}
                  >
                    Documentos
                  </li>
                  <li
                    className={`step ${currentStep >= 6 ? "step-primary" : ""}`}
                  >
                    Confirmación
                  </li>
                </ul>

                {/* Step Content */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  {currentStep === 1 && (
                    <Step1Verification
                      next={nextStep}
                      userEmail={user?.email}
                      onEnrollmentInfoLoaded={setEnrollmentInfo}
                      onDocumentsLoaded={setDocuments}
                    />
                  )}

                  {currentStep === 2 && enrollmentInfo && (
                    <Step2GradeSelection
                      next={nextStep}
                      back={prevStep}
                      enrollmentInfo={enrollmentInfo}
                    />
                  )}

                  {currentStep === 3 && enrollmentInfo && (
                    <Step3StudentData
                      next={handleStep3Next}
                      back={prevStep}
                      data={formData}
                      update={updateFormData}
                      uploadedFiles={uploadedFiles}
                      updateUploadedFiles={updateUploadedFiles}
                      enrollmentInfo={enrollmentInfo}
                      enrollmentId={
                        enrollmentInfo.actual_enrollment?.id ?? null
                      }
                      preloadedDocuments={documents}
                    />
                  )}

                  {currentStep === 4 && enrollmentInfo && (
                    <Suspense
                      fallback={<LoadingState compact className="h-48" />}
                    >
                      <Step4Documents
                        next={nextStep}
                        back={prevStep}
                        data={formData}
                        update={updateFormData}
                        uploadedFiles={uploadedFiles}
                        updateUploadedFiles={updateUploadedFiles}
                        enrollmentInfo={enrollmentInfo}
                        preloadedDocuments={documents}
                        unsignedPdfs={unsignedPdfs}
                        signedPdfs={signedPdfs}
                        setSignedPdfs={setSignedPdfs}
                      />
                    </Suspense>
                  )}

                  {currentStep === 5 && enrollmentInfo && (
                    <Step5Documents
                      next={nextStep}
                      back={prevStep}
                      data={formData}
                      update={updateFormData}
                      uploadedFiles={uploadedFiles}
                      updateUploadedFiles={updateUploadedFiles}
                      enrollmentInfo={enrollmentInfo}
                      preloadedDocuments={documents}
                    />
                  )}

                  {currentStep === 6 && enrollmentInfo && (
                    <Step6Confirmation
                      back={prevStep}
                      data={formData}
                      uploadedFiles={uploadedFiles}
                      enrollmentInfo={enrollmentInfo}
                      preloadedDocuments={documents}
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
