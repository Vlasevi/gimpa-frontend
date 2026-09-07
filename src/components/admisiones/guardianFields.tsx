/**
 * Bloques reutilizables del wizard: residencia con geo (api-colombia) y datos de una
 * persona. Se parametrizan con un `prefix` para reusarlos en estudiante, padre, madre
 * y acudiente sin repetir 60+ campos.
 *
 * Los dropdowns usan el `ComboBox` buscable (mismo estilo que matrículas). El orden y
 * los campos de residencia replican los de matrículas.
 *
 * Sobre RHF: `ComboBox` mantiene estado interno (`query`/`open`) y no expone un `ref`
 * nativo, así que no puede pasar por `register`. En vez de envolver cada instancia con
 * `<Controller>`, se lee su valor con `useWatch` (suscripción puntual al campo) y se
 * escribe con `setValue` en el `onChange` — es el mismo contrato que produce
 * `Controller` (un par `value`/`onChange` controlado por RHF), pero aquí hace falta de
 * todas formas `setValue` para la cascada (limpiar depto/ciudad/barrio al cambiar el
 * padre), así que un `Controller` por campo no habría evitado escribir esa parte.
 */

import { useEffect, useState } from "react";
import {
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";

import {
  COUNTRIES,
  BARRIOS_BARRANQUILLA,
  DOCUMENT_TYPES,
} from "@/components/shared/formLists";
import { apiFetch, API_ENDPOINTS } from "@/utils/api";
import { Field, SelectField, type SectionValues } from "./formFields";
import { ComboBox } from "./ComboBox";

type GeoItem = { id: number; name: string };

interface PrefixProps {
  prefix: string;
  control: Control<SectionValues>;
  register: UseFormRegister<SectionValues>;
  setValue: UseFormSetValue<SectionValues>;
}

const STRATA = ["1", "2", "3", "4", "5", "6"];

/**
 * Residencia con país/departamento/ciudad/barrio en cascada (api-colombia). Mismos
 * campos y orden que matrículas. Claves con `prefix`: p.ej.
 * prefix="father_residence_" → `father_residence_country`.
 */
export function GeoResidenceFields({ prefix, control, register, setValue }: PrefixProps) {
  const [departments, setDepartments] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const k = (name: string) => `${prefix}${name}`;

  const country = (useWatch({ control, name: k("country") }) as string) ?? "";
  const isColombia = country === "Colombia";
  const departmentId = useWatch({ control, name: k("department_id") }) as
    | number
    | undefined;
  const department = (useWatch({ control, name: k("department") }) as string) ?? "";
  const city = (useWatch({ control, name: k("city") }) as string) ?? "";
  const barrio = (useWatch({ control, name: k("barrio") }) as string) ?? "";

  useEffect(() => {
    if (!isColombia) {
      setDepartments([]);
      return;
    }
    let active = true;
    setLoadingDepts(true);
    apiFetch(API_ENDPOINTS.geoDepartments)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => active && setDepartments(d))
      .catch(() => undefined)
      .finally(() => active && setLoadingDepts(false));
    return () => {
      active = false;
    };
  }, [isColombia]);

  useEffect(() => {
    if (!isColombia || !departmentId) {
      setCities([]);
      return;
    }
    let active = true;
    setLoadingCities(true);
    apiFetch(`${API_ENDPOINTS.geoCities}?department=${departmentId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((c) => active && setCities(c))
      .catch(() => undefined)
      .finally(() => active && setLoadingCities(false));
    return () => {
      active = false;
    };
  }, [isColombia, departmentId]);

  const onCountry = (v: string) => {
    setValue(k("country"), v, { shouldDirty: true });
    setValue(k("department"), "", { shouldDirty: true });
    setValue(k("department_id"), undefined, { shouldDirty: true });
    setValue(k("city"), "", { shouldDirty: true });
    setValue(k("barrio"), "", { shouldDirty: true });
  };
  const onDepartment = (name: string) => {
    const d = departments.find((x) => x.name === name);
    setValue(k("department"), name, { shouldDirty: true });
    setValue(k("department_id"), d ? d.id : undefined, { shouldDirty: true });
    setValue(k("city"), "", { shouldDirty: true });
    setValue(k("barrio"), "", { shouldDirty: true });
  };
  const onCity = (name: string) => {
    setValue(k("city"), name, { shouldDirty: true });
    setValue(k("barrio"), "", { shouldDirty: true });
  };
  const onBarrio = (v: string) => setValue(k("barrio"), v, { shouldDirty: true });

  return (
    <>
      {/* País */}
      <ComboBox label="País de Residencia" options={COUNTRIES}
        value={country} onChange={onCountry} />
      {country === "Otro" && (
        <Field name={k("country_other")} label="¿Cuál país?" register={register} />
      )}

      {/* Departamento */}
      {isColombia ? (
        <ComboBox label="Departamento" options={departments.map((d) => d.name)}
          value={department} onChange={onDepartment} loading={loadingDepts} />
      ) : country ? (
        <Field name={k("department")} label="Departamento / Estado" register={register} />
      ) : null}

      {/* Ciudad */}
      {isColombia ? (
        <ComboBox label="Ciudad" options={cities.map((c) => c.name)}
          value={city} onChange={onCity} disabled={!departmentId} loading={loadingCities} />
      ) : country ? (
        <Field name={k("city")} label="Ciudad" register={register} />
      ) : null}

      {/* Barrio */}
      {city === "Barranquilla" ? (
        <>
          <ComboBox label="Barrio de Residencia" options={BARRIOS_BARRANQUILLA}
            value={barrio} onChange={onBarrio} />
          {barrio === "Otro" && (
            <Field name={k("barrio_other")} label="Especifique el barrio"
              register={register} />
          )}
        </>
      ) : (
        <Field name={k("barrio")} label="Barrio de Residencia" register={register} />
      )}

      {/* Dirección / complemento / estrato */}
      <Field name={k("address")} label="Dirección" register={register}
        placeholder="Cra 45 # 72-30" />
      <Field name={k("address_complement")} label="Complemento (Apto, Torre)"
        register={register} />
      <SelectField name={k("stratum")} label="Estrato" register={register}
        options={STRATA} />
    </>
  );
}

interface PersonWorkProps {
  prefix: string;
  register: UseFormRegister<SectionValues>;
}

/**
 * Datos personales de una persona (nombres, documento, contacto). Claves con `prefix`:
 * p.ej. prefix="father_" → `father_firstname1`. El trabajo va aparte en `WorkFields`,
 * para que el orden sea: nombres → residencia → trabajo.
 */
export function PersonFields({ prefix, register }: PersonWorkProps) {
  const k = (name: string) => `${prefix}${name}`;
  return (
    <>
      <Field name={k("firstname1")} label="Primer nombre" register={register} />
      <Field name={k("firstname2")} label="Segundo nombre" register={register} />
      <Field name={k("lastname1")} label="Primer apellido" register={register} />
      <Field name={k("lastname2")} label="Segundo apellido" register={register} />
      <SelectField name={k("document_type")} label="Tipo de documento"
        register={register} options={DOCUMENT_TYPES} />
      <Field name={k("id_number")} label="Número de documento" register={register} />
      <Field name={k("email")} label="Correo electrónico" type="email" register={register} />
      <Field name={k("phone")} label="Celular" type="tel" register={register} />
      <Field name={k("religion")} label="Religión" register={register} />
    </>
  );
}

/** Datos laborales de una persona (van al final, después de la residencia). */
export function WorkFields({ prefix, register }: PersonWorkProps) {
  const k = (name: string) => `${prefix}${name}`;
  return (
    <>
      <Field name={k("profession")} label="Profesión / ocupación" register={register} />
      <Field name={k("work_phone")} label="Teléfono del trabajo" type="tel" register={register} />
      <Field name={k("company_name")} label="Empresa donde trabaja" register={register} />
      <Field name={k("company_address")} label="Dirección de la empresa" register={register} full />
    </>
  );
}

// El acordeón local que vivía aquí (`SubSection`) fue promovido a
// `src/components/ui/SubSection.tsx` en el Paso 1 del refactor y conectado en el Paso 3
// (docs/plan-admisiones-ui-rhf-acordeon.md). `steps.tsx` importa ahora el compartido en
// vez de este — no lo dupliques de vuelta aquí.
