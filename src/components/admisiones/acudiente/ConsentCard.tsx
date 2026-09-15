/**
 * Tarjeta con la que empieza "Nueva admisión": tratamiento de datos personales y
 * declaraciones (el mismo texto que antes estaba en el último paso del formulario). Sin
 * aceptarlas no se crea nada: la solicitud nace con la aceptación
 * (`consent` en el POST; el backend guarda fecha, versión y quién declara).
 */

import { useState } from "react";
import { ShieldCheck, Info } from "lucide-react";

import { inputClass, labelClass, outlineBtnClass, primaryBtnClass } from "@/components/ui/formStyles";
import { cardClass, titleClass } from "@/components/ui/textStyles";

export interface Consent {
  accepts_truthfulness: boolean;
  accepts_data_policy: boolean;
  signed_by: string;
}

/** Texto de la versión `CONSENT_VERSION` del backend (`admissions/config.py`): si cambia
 * el texto, sube esa versión, así cada solicitud sabe qué texto se aceptó. */
const STATEMENTS: { key: "accepts_truthfulness" | "accepts_data_policy"; text: string }[] = [
  { key: "accepts_truthfulness", text: "Declaro que la información suministrada es veraz y completa." },
  {
    key: "accepts_data_policy",
    text:
      "Como representante legal del aspirante, autorizo al Gimnasio El Paraíso (GIMPA) a tratar mis " +
      "datos personales y los del aspirante, incluidos los datos sensibles de salud, con la finalidad " +
      "de adelantar el proceso de admisión, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 " +
      "(compilado en el Decreto 1074 de 2015) y la política de tratamiento de datos de la institución.",
  },
];

/** Lo que la ley pide informar al titular antes de autorizar (art. 12, Ley 1581 de 2012). */
const NOTICE = [
  "Responder las preguntas sobre datos sensibles (salud, diagnósticos, terapias) es facultativo (arts. 5 y 6, Ley 1581 de 2012).",
  "Los datos del aspirante, por ser menor de edad, se tratan respetando su interés superior y sus derechos fundamentales (art. 7, Ley 1581 de 2012).",
  "Puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar esta autorización (art. 8, Ley 1581 de 2012).",
];

export function ConsentCard({
  initialName,
  onAccept,
  onExit,
}: {
  initialName: string;
  onAccept: (consent: Consent) => void;
  onExit: () => void;
}) {
  const [checked, setChecked] = useState({ accepts_truthfulness: false, accepts_data_policy: false });
  const [name, setName] = useState(initialName);
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <div className={`${cardClass} space-y-4 p-6`}>
        <div className="flex items-start gap-3">
          <Info className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className={titleClass}>No podemos continuar sin tu autorización</h2>
            <p className="mt-2 text-base-content/80">
              Para abrir una solicitud de admisión necesitamos que aceptes el tratamiento de datos
              personales y las declaraciones. Si tienes dudas, acércate a la institución o
              comunícate con Admisiones para más información.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onExit} className={outlineBtnClass}>
            Volver a mis solicitudes
          </button>
          <button type="button" onClick={() => setDeclined(false)} className={primaryBtnClass}>
            Revisar de nuevo
          </button>
        </div>
      </div>
    );
  }

  const ready = checked.accepts_truthfulness && checked.accepts_data_policy && name.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onAccept({ ...checked, signed_by: name.trim() });
      }}
      className={`${cardClass} space-y-5 p-6`}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className={titleClass}>Antes de empezar</h2>
          <p className="mt-1 text-base-content/70">
            Para abrir la solicitud necesitamos tu autorización para el tratamiento de datos
            personales (Ley 1581 de 2012).
          </p>
        </div>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-base-content/70">
        {NOTICE.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="space-y-3">
        {STATEMENTS.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-base-300 p-4">
            <input
              type="checkbox"
              className="checkbox checkbox-primary mt-0.5"
              checked={checked[s.key]}
              onChange={(e) => setChecked((prev) => ({ ...prev, [s.key]: e.target.checked }))}
            />
            <span className="text-base-content">{s.text}</span>
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="consent-name" className={labelClass}>
          Nombre de quien declara <span className="text-error">*</span>
        </label>
        <input
          id="consent-name"
          className={inputClass}
          placeholder="Tu nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-base-300 pt-4">
        <button type="button" onClick={() => setDeclined(true)} className={outlineBtnClass}>
          No acepto
        </button>
        <button type="submit" disabled={!ready} className={primaryBtnClass}>
          Acepto y continúo
        </button>
      </div>
    </form>
  );
}

export default ConsentCard;
