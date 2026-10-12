import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import type { Profile } from "../data/trueke";
import { captureLocation } from "../services/locationService";
import { useTheme } from "../theme/ThemeContext";
import { Button } from "./Button";
import { Input } from "./Input";

export function ProfileFields({
  value,
  onChange,
  disabled = false,
  onLocating,
}: {
  value: Profile;
  onChange: (change: Partial<Profile>) => void;
  disabled?: boolean;
  onLocating: (busy: boolean) => void;
}) {
  const { ui } = useTheme();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      request.current++;
      clearTimeout(timer.current);
    },
    [],
  );
  function cancel() {
    request.current++;
    clearTimeout(timer.current);
    setLocating(false);
    onLocating(false);
  }
  async function locate() {
    if (disabled || locating) return;
    const id = ++request.current;
    setLocating(true);
    onLocating(true);
    setError("");
    // Un resultado tardío nunca pisa cambios hechos después de cancelar.
    timer.current = setTimeout(() => {
      if (request.current === id) {
        cancel();
        setError(
          "La ubicación está tardando. Puedes reintentar o escribir tu ciudad.",
        );
      }
    }, 25000);
    try {
      const result = await captureLocation();
      if (request.current !== id) return;
      onChange({
        coordinates: result.coordinates,
        ...(result.city ? { location: result.city } : {}),
      });
    } catch (cause) {
      if (request.current === id)
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo obtener la ubicación. Escribe tu ciudad o vuelve a intentarlo.",
        );
    } finally {
      if (request.current === id) cancel();
    }
  }
  const editable = !disabled && !locating;
  return (
    <View style={{ gap: 16 }}>
      <Input
        label="Nombres"
        value={value.firstName}
        onChangeText={(firstName) => onChange({ firstName })}
        autoComplete="given-name"
        autoCapitalize="words"
        maxLength={60}
        editable={editable}
      />
      <Input
        label="Apellidos"
        value={value.lastName}
        onChangeText={(lastName) => onChange({ lastName })}
        autoComplete="family-name"
        autoCapitalize="words"
        maxLength={80}
        editable={editable}
      />
      <Input
        label="Teléfono (opcional)"
        value={value.phone}
        onChangeText={(phone) => onChange({ phone })}
        placeholder="+1 809 555 0123"
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={30}
        editable={editable}
      />
      <Text style={ui.muted}>
        Incluye el código de país. Por ahora solo aparece en tu perfil personal;
        no se verifica por SMS.
      </Text>
      <Input
        label="Ciudad o municipio"
        value={value.location}
        onChangeText={(location) => onChange({ location, coordinates: null })}
        placeholder="Ej. Puerto Plata"
        maxLength={100}
        editable={editable}
      />
      <View style={ui.card}>
        <Text style={ui.heading}>Tu zona de intercambio</Text>
        <Text style={ui.muted}>
          Opcional: comparte tu ubicación con Trueke. Al guardar, se asociará
          una ubicación aproximada a tu cuenta para preparar los intercambios
          cercanos. No se publica en un mapa ni se rastrea en segundo plano.
        </Text>
        {value.coordinates && (
          <Text style={ui.text}>
            Ubicación aproximada seleccionada ·{" "}
            {new Date(value.coordinates.capturedAt).toLocaleDateString("es")}
          </Text>
        )}
        <Button
          title={
            value.coordinates
              ? "Actualizar mi ubicación"
              : "Compartir mi ubicación"
          }
          loading={disabled || locating}
          secondary
          onPress={locate}
        />
        {locating && (
          <Button
            title="Cancelar búsqueda de ubicación"
            secondary
            onPress={cancel}
          />
        )}
        {value.coordinates && !locating && (
          <Button
            title="Quitar ubicación compartida"
            secondary
            loading={disabled}
            onPress={() => onChange({ coordinates: null })}
          />
        )}
        {error ? (
          <Text accessibilityLiveRegion="polite" style={ui.error}>
            {error}
          </Text>
        ) : null}
        <Text style={ui.muted}>
          Puedes continuar solo con tu ciudad. Cambiarla manualmente quita las
          coordenadas anteriores.
        </Text>
      </View>
      <Input
        label="Sobre ti (opcional)"
        value={value.bio}
        onChangeText={(bio) => onChange({ bio })}
        placeholder="¿Qué te gustaría intercambiar?"
        multiline
        maxLength={240}
        editable={editable}
      />
    </View>
  );
}
