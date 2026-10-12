# Funcionamiento sin internet y sincronización

## Activar en Supabase

1. Abre SQL Editor en el proyecto usado por la app.
2. Copia y ejecuta `supabase/trueke-sync.sql`. Se puede ejecutar de nuevo. No toca las tablas anteriores de Refrigerio.
3. Comprueba que existen `trueke_records`, `trueke_sync_receipts`, la función `trueke_sync` y el bucket privado `trueke-private`.
4. Compila e instala el nuevo APK. El APK anterior no incluye esta sincronización.

No se ejecutó la migración desde este entorno: falta acceso administrativo. No se necesitan claves privadas en la app. La implementación usa RLS y el usuario del JWT, siguiendo https://supabase.com/docs/guides/database/postgres/row-level-security y https://supabase.com/docs/guides/storage/security/access-control.

## Qué funciona

Después del primer inicio de sesión conectado, una sesión guardada permite abrir los datos locales sin esperar a renovar el token. Esto no autoriza peticiones remotas: Supabase sigue validando la sesión y RLS. Si la sesión vence o fue revocada, la sincronización puede requerir iniciar sesión de nuevo.

Perfil, favoritos, catálogo disponible, historial, mensajes del chat de ejemplo y filtro de cercanía se guardan primero en SQLite. Cada cambio añade operaciones a una cola dentro de la misma transacción. Las operaciones sobreviven a cerrar o reiniciar la app. Volver a tener conexión, volver a primer plano o pulsar Sincronizar ahora provoca un intento; hay reintentos cada 30 segundos mientras la app está activa. No hay servicio de sincronización con la app cerrada.

Cada cuenta tiene su base local, sus registros privados y su carpeta privada de fotos. El token de un envío queda fijado para no mezclar cuentas si el usuario cambia de sesión durante una petición. El perfil editado ya no depende de actualizar metadatos de Auth: los metadatos del registro se usan solo para inicializar instalaciones nuevas.

Las fotos de perfil se suben a Storage. Se conservan copias locales y se descargan las fotos remotas al visualizarlas, para poder verlas después sin internet. Una foto nunca descargada muestra un estado vacío sin conexión. Las imágenes están en documentos locales y no se borran automáticamente; los archivos antiguos se conservan para no romper operaciones pendientes. No se ha implementado limpieza de fotos huérfanas.

## Conflictos y reintentos

Cada operación tiene un UUID; el servidor conserva recibos para que una respuesta perdida no cause un segundo cambio al reintentar. La sincronización trabaja por campo de perfil y por ID de objeto, mensaje, favorito o entrada del historial. Cambios de campos diferentes se combinan. Si dos dispositivos cambian el mismo campo, prevalece la última operación aceptada por el servidor, según el orden de sincronización, no el reloj del teléfono. Quitar elementos guarda una marca nula para impedir su reaparición. Los cambios nuevos hechos durante una petición se reaplican antes de guardar la respuesta localmente.

Esta versión sincroniza el estado privado de la cuenta. No convierte el catálogo de ejemplo en publicaciones públicas ni entrega mensajes a otras personas. El mapa y el chat real siguen pendientes. Cambiar contraseña, registro, recuperación e iniciar sesión por primera vez necesitan internet. La preferencia de tema permanece por dispositivo.

## Prueba en teléfono tras ejecutar SQL

1. Iniciar sesión conectado; esperar Sincronizado con Supabase en Mi perfil.
2. Activar modo avión, editar perfil, añadir/quitar favoritos y escribir en el chat de ejemplo.
3. Cerrar y abrir la app: conservar los cambios y el contador pendiente.
4. Desactivar modo avión con la app abierta: comprobar sincronización y registros en Supabase.
5. Abrir la misma cuenta en otra instalación y comprobar los datos. Usar otra cuenta y comprobar aislamiento.
6. Cambiar la foto offline; reconectar y comprobar Storage y la foto en otro teléfono.
7. Desconectar durante un envío y reintentar: no duplicar mensajes. Editar mientras sincroniza y comprobar que no se pierde la edición.
8. Si falta SQL, mostrar error de configuración sin borrar la cola. Corregir SQL y pulsar Sincronizar ahora.

Validado localmente: TypeScript, 21 pruebas y exportación Android/iOS. Pendiente: ejecutar la migración y prueba real de red, permisos, sesión vencida y dos dispositivos. No se ha verificado el SQL contra una instancia PostgreSQL desde este entorno.
