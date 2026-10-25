import { useState } from "react";

// estado + erros por campo dos formulários (valores sempre em texto)
export function useFormState<T extends Record<string, string>>(initial: () => T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const change = (field: keyof T) => (text: string) => {
    setValues((prev) => ({ ...prev, [field]: text }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return { values, errors, setErrors, change };
}