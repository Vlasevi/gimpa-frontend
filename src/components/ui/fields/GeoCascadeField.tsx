/**
 * Cascada geográfica país→departamento→ciudad→(barrio) (informe §3.1, §5.2). Compuesto:
 * 3-4 campos coordinados con limpieza en cascada (cambiar un campo limpia sus hijos),
 * no un `FieldDescriptor` simple.
 *
 * Generaliza `GeoResidenceFields` (`components/admisiones/guardianFields.tsx`, fetch
 * real a api-colombia) y la cascada estática de `Step3StudentData.tsx` (Matrículas,
 * arrays de módulo fijos) bajo una única API, decidida por `source.kind`:
 *
 * - `kind: "static"`: departamento SIEMPRE combobox (lista completa, nunca se filtra
 *   por país); ciudad combobox solo si `source.citiesByDepartment` tiene una entrada
 *   para el departamento elegido — si no, `<input>` de texto libre. Reproduce
 *   fielmente que hoy Matrículas solo tiene datos reales para "Atlántico"; cualquier
 *   otro departamento cae a texto libre. NO se inventa aquí un mapa completo de
 *   departamento→ciudades que no existe hoy — eso lo decide el `source` que arme quien
 *   consuma este componente (Paso 2/4), no este archivo.
 * - `kind: "api"`: fetch real de departamentos al montar (si país="Colombia") y de
 *   ciudades al cambiar de departamento, con estado `loading`, igual que
 *   `GeoResidenceFields` hoy.
 *
 * En ambas ramas: país≠"Colombia" → departamento y ciudad cambian a `<input>` de texto
 * libre (mismo comportamiento que ambos módulos hoy). La rama "static" SIEMPRE
 * renderiza departamento/ciudad (combobox o texto), igual que Matrículas hoy; la rama
 * "api" los oculta por completo hasta que se elige un país, igual que
 * `GeoResidenceFields` hoy (`country ? <Field/> : null`) — es una diferencia real entre
 * los dos módulos de referencia, no un descuido.
 *
 * Barrio: solo si `hasBarrio`; combobox si `source.barriosByCity` tiene entrada para la
 * ciudad actual (hoy, en la práctica, solo "Barranquilla" en los dos módulos), si no,
 * `<input>` de texto libre. El chequeo de "barrio === Otro" para mostrar el input
 * "Especifique el barrio" lee SIEMPRE el valor observado por `useWatch` — nunca un
 * estado sombra aparte — para no replicar el bug de `fatherBarrio`/`motherBarrio` de
 * Matrículas documentado en el informe §0.4 (esas variables nunca se sincronizan hoy,
 * así que el input "Especifique el barrio" queda inalcanzable).
 *
 * Dirección/complemento/estrato: se muestran junto con el barrio (`hasBarrio`) — en las
 * 13 instancias reales de hoy (9 en Matrículas, 4 en Admisiones) esos 3 campos
 * coinciden exactamente con las cascadas que también tienen barrio (residencia), nunca
 * con las de nacimiento/expedición (sin barrio, sin dirección).
 *
 * La lista de países NO viene de `source`: en el código real de hoy es la misma lista
 * estática (`COUNTRIES` de `@/components/shared/formLists`) en Admisiones y en
 * Matrículas — se usa directo aquí, sin duplicarla ni pedírsela al consumidor.
 *
 * Nombre del campo "especifique el barrio": Admisiones usa `${prefix}barrio_other`;
 * Matrículas usa `${prefix}otro_barrio` (nombres distintos para el mismo campo, ver
 * informe §3.1). Este componente usa `barrio_other` (la convención de la referencia
 * `GeoResidenceFields`, que es la única de las dos ya migrada a RHF). Quien migre
 * Matrículas (Paso 3/4) deberá decidir si renombra el campo o si este componente gana
 * una opción de sufijo — no es una decisión de este Paso 1 (fundación), que solo deja
 * constancia del desajuste sin resolverlo.
 *
 * Limpieza en cascada al cambiar un campo padre: SOLO ocurre en la rama `kind: "api"`
 * (reproduce `GeoResidenceFields`/Admisiones, que sí limpia hijos hoy —
 * `guardianFields.tsx:102-120`). La rama `kind: "static"` (Matrículas) NO limpia hijos:
 * sus 9 instancias reales (`Step3StudentData.tsx`, p.ej. líneas 1614-1650) hacen
 * `update({ residence_country: value })` sin tocar `residence_department`/`city`/
 * `barrio`. Es una diferencia real de comportamiento entre los dos módulos hoy, no un
 * descuido de este componente — el plan exige cero cambio de comportamiento al migrar,
 * aunque dejar datos obsoletos tras cambiar el país/departamento sea una rareza de UX
 * de Matrículas. Arreglarla no es objeto de este paso.
 *
 * `required`: `GeoCascadeFieldProps.requiredWhen` acepta `boolean | FieldCondition`.
 * Matrículas usa `required={true}` incondicional en país/depto/ciudad/barrio de sus 9
 * cascadas (mismo archivo, mismas líneas) — un `requiredWhen` que solo aceptara
 * `FieldCondition` perdería ese `true` en silencio. El `required` resultante se aplica
 * a los 4 campos (país/depto/ciudad/barrio) en sus dos variantes, combobox e `<input>`
 * libre.
 *
 * `country_other` (añadido en el Paso 2 del plan, al conectar el primer consumidor
 * real): corrección respecto a un comentario anterior de este archivo — solo las 4
 * instancias de Admisiones muestran hoy un `<input>` "¿Cuál país?" cuando
 * `country === "Otro"` (verificado en la revisión del Paso 2: Matrículas, con país
 * distinto de Colombia, solo cae departamento/ciudad a texto libre, sin ningún campo
 * "¿Cuál país?"). Se agrega igual en este componente compartido, ANTES del campo de
 * departamento. El informe del Paso 0 (§3.1/§4) no lo listó
 * como parte de `GeoCascadeFieldProps`/`DEFAULT_LABELS` — un vacío real de la
 * fundación, no una decisión deliberada de omitirlo — así que se agrega aquí mismo
 * (mismo componente, sin nueva prop: se activa solo con `country === "Otro"`, igual
 * que `barrio_other` ya hace con `barrio === "Otro"`) en vez de en el consumidor, para
 * no duplicar la posición exacta en el layout en cada `FieldGrid` que use esta
 * cascada.
 */

import { useEffect, useState } from "react";
import { useWatch } from "react-hook-form";

import { COUNTRIES } from "@/components/shared/formLists";
import { ComboBox } from "@/components/admisiones/ComboBox";
import { TextField, SelectField } from "./primitives";
import {
  conditionDependencies,
  evaluateCondition,
  watchedValuesFrom,
  type GeoCascadeFieldProps,
} from "./types";

type GeoItem = { id: number; name: string };

const STRATA = ["1", "2", "3", "4", "5", "6"];

const DEFAULT_LABELS = {
  country: "País de Residencia",
  department: "Departamento",
  city: "Ciudad",
  barrio: "Barrio de Residencia",
  address: "Dirección",
  addressComplement: "Complemento (Apto, Torre)",
  stratum: "Estrato",
};

export function GeoCascadeField({
  prefix,
  hasBarrio,
  source,
  control,
  register,
  setValue,
  disabled,
  requiredWhen,
  labels,
}: GeoCascadeFieldProps) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const k = (name: string) => `${prefix}${name}`;
  const isApi = source.kind === "api";

  const country = (useWatch({ control, name: k("country") }) as string) ?? "";
  const isColombia = country === "Colombia";
  const department = (useWatch({ control, name: k("department") }) as string) ?? "";
  const city = (useWatch({ control, name: k("city") }) as string) ?? "";
  const barrio = (useWatch({ control, name: k("barrio") }) as string) ?? "";
  const departmentId = useWatch({ control, name: k("department_id") }) as number | undefined;

  const requiredDeps =
    typeof requiredWhen === "object" ? conditionDependencies(requiredWhen) : [];
  const requiredWatched = useWatch({ control, name: requiredDeps });
  const required: boolean =
    typeof requiredWhen === "object"
      ? evaluateCondition(requiredWhen, watchedValuesFrom(requiredDeps, requiredWatched))
      : (requiredWhen ?? false);

  // ---- Rama "api": fetch real de departamentos/ciudades (igual que GeoResidenceFields)
  const fetchDepartments = source.kind === "api" ? source.fetchDepartments : undefined;
  const fetchCities = source.kind === "api" ? source.fetchCities : undefined;

  const [apiDepartments, setApiDepartments] = useState<GeoItem[]>([]);
  const [apiCities, setApiCities] = useState<GeoItem[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!fetchDepartments) return;
    if (!isColombia) {
      setApiDepartments([]);
      return;
    }
    let active = true;
    setLoadingDepts(true);
    fetchDepartments()
      .then((d) => active && setApiDepartments(d))
      .catch(() => undefined)
      .finally(() => active && setLoadingDepts(false));
    return () => {
      active = false;
    };
  }, [fetchDepartments, isColombia]);

  useEffect(() => {
    if (!fetchCities) return;
    if (!isColombia || !departmentId) {
      setApiCities([]);
      return;
    }
    let active = true;
    setLoadingCities(true);
    fetchCities(departmentId)
      .then((c) => active && setApiCities(c))
      .catch(() => undefined)
      .finally(() => active && setLoadingCities(false));
    return () => {
      active = false;
    };
  }, [fetchCities, isColombia, departmentId]);

  // ---- Opciones por rama
  const departmentOptions = isApi ? apiDepartments.map((d) => d.name) : source.departments;
  const staticCityList = !isApi ? source.citiesByDepartment[department] : undefined;
  const cityOptions = isApi ? apiCities.map((c) => c.name) : (staticCityList ?? []);
  const showCityCombo = isApi ? true : !!staticCityList;

  const barrioList = hasBarrio ? source.barriosByCity[city] : undefined;
  const showBarrioCombo = hasBarrio && !!barrioList;

  // ---- Limpieza en cascada (setValue de los hijos es responsabilidad de este
  // componente, nunca de ComboBoxField/TextField genéricos).
  //
  // SOLO se limpia cuando `source.kind === "api"` (reproduce Admisiones,
  // `guardianFields.tsx:102-120`, fielmente). Cuando `source.kind === "static"` NO se
  // limpia nada (reproduce Matrículas fielmente — ver comentario de cabecera del
  // archivo): es una diferencia de comportamiento real entre los dos módulos hoy, no
  // un descuido de este componente.
  const set = (name: string, value: unknown) => setValue(k(name), value, { shouldDirty: true });

  const onCountryChange = (v: string) => {
    set("country", v);
    if (isApi) {
      set("department", "");
      set("department_id", undefined);
      set("city", "");
      if (hasBarrio) set("barrio", "");
    }
  };
  const onDepartmentChange = (name: string) => {
    set("department", name);
    if (isApi) {
      const found = apiDepartments.find((d) => d.name === name);
      set("department_id", found ? found.id : undefined);
      set("city", "");
      if (hasBarrio) set("barrio", "");
    }
  };
  const onCityChange = (name: string) => {
    set("city", name);
    if (isApi && hasBarrio) set("barrio", "");
  };
  const onBarrioChange = (v: string) => set("barrio", v);

  return (
    <>
      <ComboBox
        label={L.country}
        value={country}
        onChange={onCountryChange}
        options={COUNTRIES}
        disabled={disabled}
        required={required}
      />
      {country === "Otro" && (
        <TextField
          name={k("country_other")}
          label="¿Cuál país?"
          register={register}
          disabled={disabled}
        />
      )}

      {/* Departamento: rama "static" siempre lo renderiza (combobox o texto, igual que
       * Matrículas hoy); rama "api" lo oculta hasta elegir país (igual que
       * GeoResidenceFields hoy). */}
      {isColombia ? (
        <ComboBox
          label={L.department}
          value={department}
          onChange={onDepartmentChange}
          options={departmentOptions}
          disabled={disabled}
          loading={isApi ? loadingDepts : false}
          required={required}
        />
      ) : !isApi || country ? (
        <TextField
          name={k("department")}
          label={L.department}
          register={register}
          disabled={disabled}
          required={required}
        />
      ) : null}

      {/* Ciudad: misma lógica de visibilidad que departamento. */}
      {isColombia && showCityCombo ? (
        <ComboBox
          label={L.city}
          value={city}
          onChange={onCityChange}
          options={cityOptions}
          disabled={disabled || (isApi && !departmentId)}
          loading={isApi ? loadingCities : false}
          required={required}
        />
      ) : !isApi || country ? (
        <TextField
          name={k("city")}
          label={L.city}
          register={register}
          disabled={disabled}
          required={required}
        />
      ) : null}

      {/* Barrio: solo si hasBarrio; siempre renderizado (nunca oculto por país/ciudad),
       * igual que las 13 instancias reales de hoy. */}
      {hasBarrio &&
        (showBarrioCombo ? (
          <>
            <ComboBox
              label={L.barrio}
              value={barrio}
              onChange={onBarrioChange}
              options={barrioList ?? []}
              disabled={disabled}
              required={required}
            />
            {barrio === "Otro" && (
              <TextField
                name={k("barrio_other")}
                label="Especifique el barrio"
                register={register}
                disabled={disabled}
              />
            )}
          </>
        ) : (
          <TextField
            name={k("barrio")}
            label={L.barrio}
            register={register}
            disabled={disabled}
            required={required}
          />
        ))}

      {/* Dirección/complemento/estrato: van con el barrio (ver comentario de cabecera). */}
      {hasBarrio && (
        <>
          <TextField
            name={k("address")}
            label={L.address}
            register={register}
            disabled={disabled}
            required={required}
            placeholder="Cra 45 # 72-30"
          />
          <TextField
            name={k("address_complement")}
            label={L.addressComplement}
            register={register}
            disabled={disabled}
          />
          <SelectField
            name={k("stratum")}
            label={L.stratum}
            register={register}
            options={STRATA}
            disabled={disabled}
          />
        </>
      )}
    </>
  );
}
