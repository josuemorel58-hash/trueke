# Trueke — React Native, Expo y autenticación Supabase

## Iniciar

```sh
npm install
npx expo start
```

El login con correo y contraseña funciona con una cuenta confirmada. **Google, registro con confirmación y recuperación por correo requieren instalar la app** para que el teléfono registre `refrigerio://`. Expo Go no sirve para probar esos retornos.

### APK Android de prueba

```sh
npx eas-cli login
npm run build:android
```

Instala el APK generado en el teléfono. El perfil preview ya contiene la URL y clave pública del proyecto actual. Este APK incluye el código y no necesita Metro. Si cambias el código, genera e instala un APK nuevo. EAS puede requerir acceso al proyecto y disponibilidad en tu plan.

Para iOS necesitas una compilación firmada y la configuración de dispositivos/certificados de Apple. Un bundle exportado no es una app instalable.

## Autenticación real

- Inicio con correo y contraseña, con validación y mensajes de error.
- Registro y reenvío del correo de confirmación.
- Login Google mediante navegador del sistema y Supabase OAuth.
- Solicitud real del correo de recuperación y formulario de nueva contraseña.
- Manejo del enlace con la app abierta o cerrada; deduplicación de callbacks.
- PKCE, sesión persistida en el dispositivo y renovación al volver al primer plano.
- Cierre de sesión del dispositivo actual.

Las peticiones de autenticación requieren internet. No se almacenan contraseñas en la base local. El SDK persiste la sesión usando el adaptador SQLite localStorage; este almacenamiento no equivale a un almacén cifrado de hardware.

## Configuración externa para que los enlaces regresen

En Supabase → Authentication → URL Configuration → Redirect URLs agrega exactamente:

```text
refrigerio://auth/callback
refrigerio://auth/reset
```

En Google Cloud, el cliente OAuth web debe tener como URI de redirección autorizada:

```text
https://aokishqhzilstqakmhim.supabase.co/auth/v1/callback
```

El callback de Google apunta a Supabase; después Supabase devuelve al teléfono usando `refrigerio://auth/callback`. Si la pantalla de consentimiento de Google está en modo de pruebas, agrega tus cuentas de prueba.

Google y Email se verificaron habilitados mediante el endpoint público `/auth/v1/settings`. El registro está permitido y la confirmación de email está activada. El SMTP fue indicado como configurado por el propietario; la app no tiene acceso administrativo para comprobar el servidor SMTP, las plantillas ni la lista de Redirect URLs.

En las plantillas de Confirm signup y Reset password de Supabase, conserva el enlace `{{ .ConfirmationURL }}`. No lo sustituyas por una URL fija: ese enlace valida el token y luego respeta el destino solicitado por la app. Con PKCE, solicita y abre el correo en la misma instalación. Si solicitas otro enlace, utiliza el más reciente. Reinstalar o borrar los datos elimina el verificador del intento anterior.

Configura SMTP y el remitente en Supabase, nunca en variables EXPO_PUBLIC. Las claves privadas de Google y SMTP permanecen en el servidor. El archivo .env solo necesita las dos variables públicas de .env.example. Para compilaciones distintas de preview configura también esas variables en EAS.

Referencias oficiales:
- https://supabase.com/docs/guides/auth/native-mobile-deep-linking
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-smtp

## Estructura

```text
App.tsx
src/
  navigation/AppNavigator.tsx       Stack y Bottom Tabs
  state/AuthContext.tsx            Sesión, recuperación y enlaces entrantes
  state/TruekeContext.tsx          Datos locales separados por usuario
  services/authService.ts          Operaciones Supabase y OAuth
  services/authRedirect.ts         Validación de enlaces y errores
  lib/supabase.ts                  Cliente PKCE y persistencia de sesión
  theme/index.ts                  Tema compartido
  data/trueke.ts                   Modelos y catálogo inicial
  components/                     Button, Input, ItemCard, CategoryChip
  screens/trueke/                  Inicio, autenticación, perfil y chat
 tests/auth.test.cjs               Pruebas de los flujos de retorno
```

Los archivos antiguos de cocina permanecen fuera de la navegación de Trueke. Se conservaron el scheme `refrigerio`, identificadores nativos y proyecto EAS para mantener la identidad de instalación.

## Persistencia en el teléfono

Cada cuenta utiliza su propia base SQLite `trueke-user-<user-id>.db`. Perfil, foto, catálogo, mensajes, historial y preferencias sobreviven a los reinicios y al cierre de sesión. Una segunda cuenta abre otra base. La foto se copia a la carpeta de documentos de la app.

La antigua base de demostración `trueke.db` se conserva, pero no se asigna automáticamente a una cuenta porque sus datos no tenían propietario autenticado. No se ha borrado.

No hay sincronización del catálogo ni del chat entre teléfonos. Desinstalar o borrar almacenamiento puede eliminar los datos locales. La ubicación, distancias y catálogo inicial siguen siendo ejemplos; los mensajes de chat se guardan localmente y no se envían a otra persona. Publicar sigue siendo solo navegación. Las fotos del catálogo requieren internet.

## Verificación

```sh
npm run typecheck
npm run test:auth
npx expo export --platform android --output-dir dist-trueke-android
npx expo export --platform ios --output-dir dist-trueke-ios
```

Prueba de extremo a extremo en el APK instalado:

1. Crear una cuenta con un correo que controles. Abrir el mensaje en ese teléfono y confirmar; la app debe abrir Inicio.
2. Cerrar sesión y entrar con correo/contraseña. Probar también contraseña incorrecta.
3. Cerrar sesión y elegir Google; comprobar regreso a Inicio y probar cancelación del navegador.
4. Solicitar recuperación, cerrar la app y abrir el enlace del correo. Debe mostrar Nueva contraseña, no Inicio. Guardar y probar la nueva contraseña.
5. Abrir un enlace vencido o ya usado: debe mostrar un error, sin permitir cambiar una contraseña sin sesión verificada.
6. Editar perfil y guardar mensajes. Reiniciar y verificar persistencia. Entrar con otra cuenta y comprobar que sus datos son independientes.

Las pruebas automatizadas usan adaptadores controlados y no envían correos. TypeScript y exportación de bundles no verifican la entrega SMTP ni el consentimiento real de Google; esas comprobaciones requieren cuenta y teléfono del propietario.

### Corrección del retorno de recuperación

El manejador acepta también callbacks de autenticación en `refrigerio://` y `refrigerio://login` cuando traen código, tokens o un error. El tipo de recuperación devuelto por el intercambio PKCE se conserva aunque el destino no sea `/auth/reset`. La navegación recibe la sesión verificada directamente, además de escuchar los eventos del SDK. Un enlace sin credenciales no habilita cambios de contraseña.

Después de actualizar el APK, solicita un correo nuevo desde esa instalación. Si sigue abriendo únicamente el login, revisa Redirect URLs (`refrigerio://auth/reset`) y que la plantilla Reset password use `{{ .ConfirmationURL }}` como enlace, no `{{ .SiteURL }}` ni una dirección fija a la app.

## Icono, contraseñas y apariencia

- `assets/trueke-icon.png` contiene la imagen proporcionada, usada como icono nativo.
- Los campos de contraseña permiten Mostrar/Ocultar en login, registro y restablecimiento. Empiezan ocultos.
- Apariencia está disponible en login y Mi perfil → Configuración: Claro, Oscuro o Según el teléfono. Se guarda en el dispositivo y permanece al cerrar sesión.
- Todas las pantallas activas de Trueke, navegación, tarjetas, formularios y chat consumen `src/theme/ThemeContext.tsx`.
- `expo-system-ui` y `userInterfaceStyle: automatic` habilitan el seguimiento del sistema en Android. Requiere recompilar la app para incluir el módulo nativo y el icono.
- Verificación manual en teléfono: alternar los tres modos, reiniciar, cambiar la apariencia del teléfono con modo automático seleccionado y probar Mostrar/Ocultar sin perder el texto.

## Perfil personalizado y ubicación opcional

El registro solicita nombres, apellidos y ciudad/municipio. Teléfono internacional, descripción y ubicación del dispositivo son opcionales. El teléfono es de contacto, no está verificado por SMS. Editar perfil reutiliza el mismo formulario.

Los datos se guardan en `user_metadata.trueke_profile` mediante Supabase Auth (registro y `updateUser`) y se recuperan al abrir la cuenta. Se mantiene una copia SQLite; las cuentas antiguas se migran sin borrar objetos, chats, historial ni foto. Las rutas de fotos locales no se envían a Supabase. No hay una tabla pública de perfiles, un mapa compartido ni sincronización en vivo entre dispositivos.

`expo-location` pide permiso solo en primer plano al pulsar Compartir mi ubicación. Se toma una lectura, se redondean latitud/longitud a tres decimales y se guardan precisión y fecha. La ciudad se propone mediante geocodificación inversa; si falla se permite escribirla. Se puede cancelar la espera, denegar el permiso, quitar las coordenadas o continuar solo con ciudad. Editar manualmente la ciudad borra las coordenadas anteriores para no asociar dos zonas diferentes. Quitar ubicación requiere Guardar cambios para actualizar la cuenta. El mapa y las distancias reales quedan pendientes; las distancias del catálogo siguen siendo de ejemplo. Trueke mantiene solo trueques, sin ventas.

Archivos principales: `src/components/ProfileFields.tsx`, `src/data/profile.ts`, `src/services/locationService.ts`, `src/state/TruekeContext.tsx`.

Validación: `npm run typecheck`, `npm run test:auth` (16 pruebas), `npx expo export --platform all --output-dir dist-trueke-profile`.

Prueba en un teléfono con una nueva compilación: registrar y confirmar una cuenta; comprobar nombres tras reiniciar; editar teléfono; denegar y conceder GPS; apagar servicios de ubicación; cancelar búsqueda; quitar coordenadas y volver a entrar. La nueva dependencia nativa requiere generar otro APK (`npm run build:android`); el APK anterior no incluye esta mejora.

Referencias: https://supabase.com/docs/reference/javascript/auth-signup y https://docs.expo.dev/versions/latest/sdk/location/.

## Mi perfil, contraseña y favoritos

- Mi perfil muestra nombres, apellidos, correo de la sesión, teléfono, ciudad, descripción y estado de ubicación, con acceso a Editar perfil.
- Cambiar contraseña abre una ruta privada con nueva contraseña, confirmación, Mostrar/Ocultar, carga, errores y confirmación de éxito. Usa Supabase Auth; si el servidor requiere reautenticación permite solicitar un código e introducirlo. No guarda contraseñas en SQLite. Esta operación cambia la contraseña de Trueke, no la de Google.
- Cada tarjeta permite agregar/quitar favoritos con el corazón. Mi perfil → Favoritos muestra los objetos guardados y un estado vacío. Se persisten en la base SQLite de cada usuario, sobreviven al reinicio y al cierre de sesión; no se sincronizan entre teléfonos. La migración inicializa la lista en instalaciones antiguas sin borrar sus datos.
- Verificación: TypeScript, 18 pruebas y exportaciones Android/iOS. Prueba manual pendiente: marcar desde Inicio, desmarcar en Perfil, reiniciar, cambiar de cuenta y comprobar separación; cambiar contraseña y verificar el login nuevo, incluyendo código incorrecto o vencido cuando aplique.
- Referencia de la operación de contraseña: https://supabase.com/docs/reference/javascript/auth-updateuser.

### Selector de apariencia en Mi perfil

El selector está ahora directamente en Mi perfil. Se retiró de login y Configuración. Usa iconos de sol, luna y teléfono, muestra debajo la opción activa y conserva etiquetas accesibles y la preferencia guardada.

### Login con identidad Trueke

El login utiliza el logo local `assets/trueke-icon.png`, encabezado centrado, formulario con ancho máximo de 440 y enlaces discretos para recuperar acceso y crear cuenta. Conserva Google, mostrar/ocultar contraseña, teclado, áreas seguras y el tema elegido desde Mi perfil.

## Actualización: funcionamiento offline y Supabase

La app ahora guarda cambios primero en SQLite y mantiene una cola persistente para sincronizarlos con Supabase al recuperar conexión. El perfil editado, favoritos, catálogo privado, historial y chat de ejemplo pasan a usar esta sincronización; las descripciones anteriores de almacenamiento exclusivamente local quedan sustituidas por esta sección. Se incluyen fotos de perfil en Storage privado y caché local de imágenes.

**Paso pendiente:** ejecutar `supabase/trueke-sync.sql` en el SQL Editor y generar un nuevo APK. Consulta `docs/offline-sync.md` para instalación, límites, resolución de conflictos y prueba en dos teléfonos. El chat sigue siendo de ejemplo: sincronizarlo no envía mensajes a otra persona.

## Configuración al clonar desde GitHub

Copia `.env.example` a `.env` y completa las variables públicas de tu proyecto Supabase. No subas `.env`. Las compilaciones EAS usan las variables del entorno `preview` configuradas en Expo; `eas.json` no contiene claves. En una cuenta Expo diferente configura esas variables y vincula tu proyecto antes de compilar.
