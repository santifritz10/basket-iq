# Plantillas de correo de Basket Lab

Dónde se pegan, asuntos y requisitos: ver [`docs/auth/configuracion.md`](../auth/configuracion.md), sección 2.4.

| Archivo | Plantilla de Supabase |
| --- | --- |
| `confirmacion-registro.html` | Confirm sign up |
| `recuperar-contrasena.html` | Reset password |
| `cambio-de-correo.html` | Change email address |
| `aviso-contrasena-cambiada.html` | Password changed (notificación de seguridad) |
| `aviso-correo-cambiado.html` | Email address changed (notificación de seguridad) |
| `bienvenida.html` | — (preparada; Supabase no envía bienvenida) |

- Los enlaces se arman con `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`.
  Tipos: `email` (registro), `recovery` (contraseña), `email_change` (cambio de correo).
- Diseño con tablas y estilos en línea, ancho máximo 560 px, compatible con Gmail, Outlook y Apple Mail.
- El logo es `images/logo-basketlab-email.png` (PNG del logo oficial, porque Gmail no muestra SVG).
