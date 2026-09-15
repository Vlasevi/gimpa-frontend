import type { ToastVariant } from "@/hooks/use-toast";

/** Mostrar un toast (lo provee `MatriculasEstudiantes` con `useToast`). */
export type FlashFn = (type: ToastVariant, msg: string) => void;
