# Autenticación de Basket Lab: configuración de producción

Guía para dejar funcionando registro, confirmación de correo, inicio de sesión y
recuperación de contraseña en **https://basket-iq.vercel.app** sin intervención manual.

El código ya está listo. Lo que falta se configura en los paneles de **Supabase** y **Vercel**
(y, si querés Google, en **Google Cloud**). Nunca pegues claves privadas en el chat.

---

## 1. Cómo funciona (resumen)

| Pantalla | Ruta |
| --- | --- |
| Iniciar sesión | `/login` |
| Crear cuenta | `/registro` |
| Revisá tu correo / reenviar confirmación | `/verificar-correo` |
| Recuperar contraseña | `/recuperar-contrasena` |
| Enlaces de los correos (confirmación, recuperación, cambio de correo, Google) | `/auth/confirm` |
| Contraseña nueva (solo desde un enlace de recuperación) | `/nueva-contrasena` |
| Bienvenida y datos iniciales | `/bienvenida` |
| Mi cuenta (perfil y contraseña) | `/cuenta` |
| Cerrar sesión | `/cerrar-sesion` |

- Los correos llevan enlaces del tipo `https://basket-iq.vercel.app/auth/confirm?token_hash=…&type=…`.
  Funcionan aunque se abran en otro navegador o en el celular.
- La URL de retorno se calcula en un solo lugar (`lib/auth/site-url.js`). En producción **nunca**
  usa localhost: si falta la variable, usa `https://basket-iq.vercel.app`.
- Los destinos `?next=` se validan: solo rutas internas, nunca dominios externos.
- La sesión vive en el navegador (Supabase) y se copia a una cookie `httpOnly` que dura lo mismo
  que el token. Las páginas protegidas (`/assistant`, `/players`, `/plays`, etc.) la validan en el
  servidor y, si no hay sesión, mandan a `/login?next=…`.

---

## 2. Supabase (obligatorio)

Panel: https://supabase.com/dashboard → tu proyecto.

### 2.1 URLs (esto es lo que hoy manda los enlaces a localhost)

**Authentication → URL Configuration**

- **Site URL**: `https://basket-iq.vercel.app`
- **Redirect URLs** (botón *Add URL*, una por línea):
  - `https://basket-iq.vercel.app/auth/confirm**`
  - `http://localhost:3000/auth/confirm**` (solo si probás en tu computadora)

No agregues comodines generales como `https://*.vercel.app/**`. Si algún día usás una URL de
prueba fija (por ejemplo, un dominio de staging), agregala con la misma forma
`https://<dominio>/auth/confirm**` y sumala también en `AUTH_ALLOWED_ORIGINS` (ver Vercel).

### 2.2 Correo y contraseñas

**Authentication → Sign In / Providers → Email**

- **Enable Email provider**: activado.
- **Confirm email**: **activado** (no lo desactives para "arreglar" el registro).
- **Secure email change**: activado.
- **Minimum password length**: `8` (la app ya exige 8 caracteres, una letra y un número; los
  usuarios actuales no se ven afectados porque el mínimo solo se aplica al crear o cambiar).

### 2.3 Envío de correos (SMTP) — la causa de que no lleguen

El servicio de correo que trae Supabase por defecto **solo entrega a los miembros del equipo
del proyecto** y como máximo **2 correos por hora**
([docs](https://supabase.com/docs/guides/auth/auth-smtp)). Por eso a un usuario real no le
llega el correo. Hace falta un SMTP propio. Opciones con plan gratuito (verificado el 2026-11-27):

| Proveedor | Gratis | Comentario |
| --- | --- | --- |
| **Resend** | 3.000 correos/mes, 100 por día | Recomendado. Para enviar a cualquier destinatario necesitás verificar un **dominio propio**. |
| **Brevo** | 300 correos por día | Permite empezar con un remitente verificado, pero enviar "desde" una dirección de Gmail suele terminar en spam: también conviene un dominio propio. |

**Qué necesitás**: un dominio propio (por ejemplo `basketlab.com.ar` o similar; cuesta poco
por año, **es un gasto que tenés que decidir vos**). En el panel del dominio vas a agregar los
registros DNS que te indique el proveedor (SPF, DKIM y, recomendado, DMARC). Sirven para que
Gmail/Outlook confíen en que el correo es legítimo y no lo manden a spam.

#### Opción elegida por ahora: Brevo sin dominio (prueba)

1. Crear cuenta gratis en https://www.brevo.com (no pide tarjeta).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: nombre `Basket Lab` y tu correo
   (por ejemplo, tu Gmail). Brevo te manda un código o enlace para verificarlo.
3. **Settings → SMTP & API → pestaña SMTP**: anotá el **Login** que aparece ahí y tocá
   **Generate a new SMTP key** (es distinta de la API key). No la compartas.
4. En Supabase: **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Sender email: el correo que verificaste en el paso 2 (tiene que ser exactamente el mismo).
   - Sender name: `Basket Lab`
   - Host: `smtp-relay.brevo.com` · Port: `587`
   - Username: el Login del paso 3 · Password: la SMTP key.
   - Minimum interval: dejar 60 segundos. → **Save changes**.
5. **Authentication → Rate Limits**: subir el límite de correos por hora (por ejemplo, a 50).
6. Probar con un registro real. Si no llega: Brevo → **Transactional → Logs**, y Supabase →
   **Authentication → Logs**.

Limitación: como el remitente es una dirección gratuita (Gmail, Hotmail…) enviada por otro
servidor, Gmail y Outlook pueden marcarlo como spam o rechazarlo. Para usuarios reales a largo
plazo conviene pasar a un dominio propio (en Brevo: **Domains → Add a domain** y cargar los
registros SPF/DKIM; o la opción con Resend de abajo).

#### Opción recomendada a futuro: dominio propio + Resend

Pasos:

1. Crear cuenta en Resend → **Domains → Add domain** → cargar los registros DNS que muestra →
   esperar a que diga *Verified*.
2. **API Keys → Create API key** (permiso *Sending access*). Copiala, no la compartas.
3. En Supabase: **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Sender email: `no-reply@<tu-dominio>`
   - Sender name: `Basket Lab`
   - Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: la API key.
4. **Authentication → Rate Limits**: con SMTP propio, Supabase arranca en 30 correos por hora.
   Subilo a lo que tu plan permita (con Resend gratis, hasta ~100 por hora es razonable).

### 2.4 Plantillas de correo

**Authentication → Emails → Templates**. Pegá el HTML de `docs/email-templates/` en cada una:

| Plantilla de Supabase | Archivo | Asunto sugerido |
| --- | --- | --- |
| Confirm sign up | `confirmacion-registro.html` | Confirmá tu cuenta de Basket Lab |
| Reset password | `recuperar-contrasena.html` | Recuperá tu contraseña de Basket Lab |
| Change email address | `cambio-de-correo.html` | Confirmá tu nuevo correo en Basket Lab |
| Password changed (notificación de seguridad) | `aviso-contrasena-cambiada.html` | Tu contraseña de Basket Lab se cambió |
| Email address changed (notificación de seguridad) | `aviso-correo-cambiado.html` | El correo de tu cuenta de Basket Lab cambió |

- Las plantillas usan las variables oficiales (`{{ .SiteURL }}`, `{{ .TokenHash }}`,
  `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .OldEmail }}`); no tienen enlaces fijos ni tokens.
- El logo se carga desde `https://basket-iq.vercel.app/assets/images/logo-basketlab-email.png`
  (PNG generado del mismo logo del menú, porque muchos clientes de correo no muestran SVG).
- Las notificaciones de seguridad solo se envían si están activadas en el proyecto.
- `bienvenida.html` queda preparada, pero Supabase no tiene plantilla de bienvenida: hoy la
  bienvenida se muestra dentro de la app (`/bienvenida`). Enviarla por correo requiere un
  servicio adicional; no está conectado.
- Mientras no pegues las plantillas, los correos por defecto de Supabase **también funcionan**
  con la app nueva (la app reconoce ambos formatos).

### 2.5 Migración SQL (recomendada, no destructiva)

**SQL Editor → New query** → pegá `docs/sql/010-auth-profiles.sql` → **Run**.

- Agrega columnas opcionales de perfil (rol deportivo, club, categorías).
- Crea el perfil automáticamente al registrarse (si falla, no bloquea el registro).
- No borra ni modifica usuarios, perfiles, contraseñas ni datos.
- Se puede ejecutar dos veces sin problema. Reversión: `docs/sql/010-auth-profiles-rollback.sql`.
- Sin esta migración la app funciona igual: guarda esos datos opcionales en la cuenta.

### 2.6 Google (opcional, se puede hacer después)

1. https://console.cloud.google.com → crear/elegir proyecto.
2. **APIs & Services → OAuth consent screen**: tipo *External*, nombre `Basket Lab`, correo de
   soporte, logo opcional, dominio autorizado `basket-iq.vercel.app` (y `supabase.co`).
   Scopes: `openid`, `email`, `profile`. Publicar la app (*In production*).
3. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://basket-iq.vercel.app`
   - Authorized redirect URIs: `https://<ref-de-tu-proyecto>.supabase.co/auth/v1/callback`
     (lo copiás tal cual desde Supabase → Authentication → Sign In / Providers → Google).
4. En Supabase → **Sign In / Providers → Google**: activar y pegar *Client ID* y *Client Secret*.
   El secreto queda solo en Supabase; la app nunca lo ve.
5. En Vercel, `AUTH_GOOGLE_ENABLED=true` y redeploy. Recién ahí aparece el botón
   «Continuar con Google». Sin esa variable el botón no se muestra.

Cuentas duplicadas: Supabase vincula una cuenta de Google con una cuenta existente del mismo
correo solo cuando el correo está verificado. La app no hace vinculaciones propias por correo.

### 2.7 Dónde ver errores

- **Authentication → Logs** (o *Logs → Auth*): envíos de correo fallidos, enlaces vencidos,
  límites de frecuencia. Si ves `Email address not authorized`, es el SMTP por defecto (2.3).
- En la app, los errores muestran un **código de referencia** (por ejemplo `otp_expired`) que
  coincide con lo que aparece en esos logs. Nunca se registran contraseñas ni tokens.

---

## 3. Vercel

**Project → Settings → Environment Variables**

| Variable | Valor | Entornos | Tipo |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://basket-iq.vercel.app` | Production | Pública (no es secreta) |
| `AUTH_ALLOWED_ORIGINS` | (opcional) orígenes de prueba separados por coma, p. ej. `https://staging.tudominio.com` | Preview | Privada |
| `AUTH_GOOGLE_ENABLED` | `true` solo cuando Google esté configurado | Production (y Preview si lo usás) | Privada |
| `SUPABASE_URL` | ya existe | Todos | Privada |
| `SUPABASE_ANON_KEY` | ya existe | Todos | Privada (la anon key igual es pública por diseño) |
| `SUPABASE_SERVICE_ROLE_KEY` | ya existe | Todos | **Secreta**. Nunca con prefijo `NEXT_PUBLIC_`. |

- Después de cambiar variables: **Deployments → … → Redeploy**.
- Dominio: si más adelante usás un dominio propio para la app, agregalo en **Settings → Domains**,
  cambiá `NEXT_PUBLIC_SITE_URL` y la **Site URL** / **Redirect URLs** de Supabase al nuevo dominio.

---

## 4. Verificación en producción (con una cuenta de prueba tuya)

1. Abrí `https://basket-iq.vercel.app/registro` en una ventana privada y registrate con un correo
   de prueba que puedas leer (no hace falta que sea nuevo en tu vida, sí en Basket Lab).
2. Tiene que aparecer «Revisá tu correo». El correo debe llegar en pocos minutos (mirá spam).
3. El botón del correo tiene que abrir `https://basket-iq.vercel.app/auth/confirm?...`
   (**no** localhost) y llevarte a la bienvenida.
4. Cerrá sesión (menú de usuario → Cerrar sesión) e iniciá sesión de nuevo.
5. Probá «¿Olvidaste tu contraseña?» → correo → enlace → contraseña nueva → iniciar sesión con la nueva.
6. Volvé a abrir el mismo enlace de recuperación: tiene que decir «Este enlace venció».
7. Probá desde el celular: login, registro y recuperación.
8. Entrá con tu cuenta de siempre y revisá que tus jugadas, entrenamientos y conversaciones
   del Asistente estén intactos.
