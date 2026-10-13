# Comunidad: propuesta de modelo de datos, moderación y permisos

Estado:

- **Habilitado (con datos reales):** el Co-Piloto de Negocio (productos, precio recomendado, CPA
  máximo, tests con veredicto y plan de capital) y la Ruta de dropshipping (6 fases, 23 pasos).
  Tablas `copilot_products`, `copilot_tests`, `copilot_plans` y `dropship_progress` con RLS de
  solo dueño (migración `0003`). Motor en `src/lib/copilot/engine.ts`, sin acceso a BD y probado
  en `tests/unit/copilot.test.ts`. Están abiertos a todas las cuentas (sin Premium por ahora).
- **Propuesta, sin tablas creadas:** el muro, los en vivo y los retos. Siguen como interfaz con
  datos de ejemplo (`src/lib/community/sample.ts`) y un aviso de vista previa. Lo de abajo se
  revisa y aprueba antes de escribir esas migraciones.

## Principios

- Igual que el resto de la app: aislamiento por `user_id`, RLS forzada, importes en unidades
  menores, fechas ISO, auditoría de acciones sensibles.
- A diferencia de las finanzas, el contenido de la comunidad **sí es visible para otros
  miembros**. Por eso las políticas RLS no son «solo el dueño»: leer depende de la pertenencia al
  espacio; escribir, del dueño y de su rol.
- Nada de rankings por dinero. Los datos financieros personales nunca se publican
  automáticamente: adjuntar un test del Co-Piloto copia solo el resumen que la persona elige.

## Entidades

| Tabla | Campos clave | Notas |
|---|---|---|
| `community_spaces` | `id`, `slug` (`muro`, `emprendedores`), `name`, `premium_only` (bool), `created_at` | Espacios: muro general y Emprendedores. |
| `community_profiles` | `user_id` (PK, FK users), `display_name`, `initials`, `city`, `phase` (int, nullable), `bio`, `created_at` | Perfil público separado de `users`: nunca se expone el correo. |
| `community_memberships` | `space_id`, `user_id`, `role` (`member`, `moderator`, `host`, `admin`), `joined_at`, `muted_until` | PK (`space_id`, `user_id`). |
| `posts` | `id`, `space_id`, `author_id`, `kind` (`avance`, `duda`, `test`, `video`), `body` (≤ 4 000), `pinned` (bool), `status` (`visible`, `hidden`, `deleted`), `created_at`, `edited_at` | Índice (`space_id`, `created_at desc`). |
| `post_attachments` | `post_id`, `type` (`copilot_test`, `image`, `video`), `payload` (jsonb validado), `created_at` | Un test adjunto guarda solo: producto, CPA, máximo, días y veredicto. |
| `comments` | `id`, `post_id`, `author_id`, `parent_id` (nullable, un nivel), `body` (≤ 2 000), `highlighted` (bool), `status`, `created_at` | «Respuesta destacada» = `highlighted`, solo autor del post o moderador. |
| `reactions` | `target_type` (`post`, `comment`), `target_id`, `user_id`, `kind` (`useful`), `created_at` | PK compuesta: una reacción por persona y objeto. Contadores se calculan o se cachean en una vista. |
| `saved_posts` | `user_id`, `post_id`, `created_at` | Privado: RLS solo dueño. |
| `live_events` | `id`, `space_id`, `title`, `starts_at` (timestamptz), `duration_min`, `status` (`scheduled`, `live`, `recorded`, `cancelled`), `recording_url`, `transcript_url`, `host_id` | Video con subtítulos y transcripción obligatorios al publicar la grabación. |
| `event_registrations` | `event_id`, `user_id`, `remind` (bool), `submission_url` (nullable), `created_at` | «Recordarme» y «Enviar mi tienda». |
| `challenges` | `id`, `space_id`, `title`, `starts_on`, `ends_on`, `steps` (int) | Reto de la semana. |
| `challenge_progress` | `challenge_id`, `user_id`, `completed_steps`, `updated_at` | PK compuesta; CHECK `completed_steps` entre 0 y `steps`. |
| `reports` | `id`, `target_type`, `target_id`, `reporter_id`, `reason` (`spam`, `promesas`, `datos_personales`, `irrespeto`, `otro`), `note`, `status` (`open`, `resolved`, `dismissed`), `resolved_by`, `created_at` | Una denuncia abierta por persona y objeto. |
| `moderation_actions` | `id`, `moderator_id`, `target_type`, `target_id`, `action` (`hide`, `restore`, `delete`, `mute`, `pin`, `unpin`), `reason`, `created_at` | Bitácora inmutable (solo INSERT). |
| `subscriptions` | `user_id`, `plan` (`premium`), `status` (`active`, `past_due`, `cancelled`), `current_period_end`, `provider`, `provider_ref` | **Futuro**: cobro en línea aún no definido. Hasta entonces Premium se asigna a mano. |

## Permisos (RLS + servidor)

| Acción | Sin Premium | Premium | Moderador | Admin |
|---|---|---|---|---|
| Leer muro general | Sí | Sí | Sí | Sí |
| Leer Emprendedores | Sí (solo lectura) | Sí | Sí | Sí |
| Publicar / comentar / reaccionar en Emprendedores | No (aviso «necesitas Premium») | Sí | Sí | Sí |
| Publicar en el muro general | Sí | Sí | Sí | Sí |
| Editar o borrar lo propio | Sí | Sí | Sí | Sí |
| Destacar respuesta | Autor del post | Autor del post | Sí | Sí |
| Fijar, ocultar, restaurar, silenciar | No | No | Sí (en su espacio) | Sí |
| Usar el Co-Piloto y la ruta | Sí (hoy abierto a todas las cuentas) | Sí | — | Sí |

- La regla de Premium vive en el servidor (`requirePremium()` en las acciones) **y** en RLS
  (política de INSERT sobre `posts`/`comments`/`reactions` que verifica `subscriptions.status`
  o el rol), para que un error de interfaz no abra la escritura.
- Se lee con `app.user_id` como hoy; las políticas de SELECT permiten filas `visible` del espacio
  y las propias aunque estén ocultas.

## Moderación

1. Cualquiera puede **reportar** (motivo + nota opcional).
2. Con 3 reportes abiertos de personas distintas, el contenido se **oculta en espera de revisión**
   (se avisa al autor).
3. Un moderador resuelve: restaurar, borrar o silenciar al autor por un tiempo
   (`muted_until`). Todo queda en `moderation_actions`.
4. Reglas visibles en cada espacio: números reales, nada de promesas de ganancias rápidas,
   preguntar no es de novatos. Las promesas de ganancias y la publicación de datos personales
   de terceros son motivo de borrado directo.
5. Límite de frecuencia: 10 publicaciones y 60 comentarios por hora por persona.

## Notificaciones (propuesta)

En la app primero (campana) y correo opcional: respuesta a tu publicación, respuesta destacada,
recordatorio de en vivo 1 h antes, inicio de reto, resolución de un reporte tuyo.

## Pendiente de decidir

- Precio de Premium, proveedor de pagos y lista de acceso anticipado.
- Plataforma de video en vivo (y dónde se guardan grabaciones y transcripciones).
- Si los perfiles muestran ciudad y fase por defecto o son opcionales (propuesta: opcionales).
- Retención: cuánto tiempo se guardan publicaciones borradas antes de eliminarse.
