# Basket Lab + Supabase (Fase 1 Usuarios)

Esta guia explica, paso a paso y sin suponer conocimiento previo, como dejar Supabase listo para registro/inicio de sesion de usuarios en Basket Lab.

## 1) Prerrequisitos

- Tener una cuenta en [Supabase](https://supabase.com/).
- Tener este proyecto abierto localmente.
- Abrir la app desde `http://localhost` (no usar `file://`).

## 2) Crear proyecto en Supabase

1. Entrar a [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Hacer click en **New project**.
3. Elegir organizacion (o crear una).
4. Completar:
   - **Name**: por ejemplo `basket-lab-dev`.
   - **Database Password**: guardar esta clave en un lugar seguro.
   - **Region**: elegir la mas cercana.
5. Hacer click en **Create new project**.
6. Esperar a que termine el aprovisionamiento.

## 3) Activar autenticacion por email/password

1. En el menu izquierdo, abrir **Authentication**.
2. Ir a **Providers**.
3. Verificar que **Email** este habilitado.
4. En esta fase local, recomiendo:
   - **Confirm email**: desactivado para pruebas rapidas.
5. Guardar cambios.

> Si dejas Confirm email activado, el registro funciona pero el usuario debe confirmar su correo antes de iniciar sesion.

## 4) Configurar URL para uso local

1. Ir a **Authentication** -> **URL Configuration**.
2. En **Site URL** poner:
   - `http://localhost:5500` (si usas Live Server)
   - o el puerto local que uses.
3. En **Redirect URLs** agregar:
   - `http://localhost:5500`
   - `http://127.0.0.1:5500`
4. Guardar.

## 5) Crear tabla `profiles` + RLS

1. Ir a **SQL Editor**.
2. Hacer click en **New query**.
3. Copiar y pegar el contenido de `docs/supabase-schema.sql`.
4. Ejecutar con **Run**.
5. Verificar en **Table Editor** que exista `public.profiles`.

### Que crea ese script

- Tabla `profiles` relacionada 1:1 con `auth.users`.
- Campos:
  - `id` (uuid, PK, referencia a `auth.users.id`)
  - `username` (unico)
  - `full_name`
  - `created_at`
  - `updated_at`
- Trigger para actualizar `updated_at` en cada edicion.
- RLS activado con politicas para que cada usuario:
  - lea su propio perfil
  - inserte su propio perfil
  - actualice su propio perfil
- Tabla `user_app_data` (sincronizacion cross-device) con tipos:
  - `plays`
  - `trainings`
  - `annual_plans`
  - `shooting_heatmap`
- Politicas RLS para que cada usuario solo lea/edite sus propios datos de app.

## 6) Copiar credenciales del proyecto

1. Ir a **Project Settings** -> **API**.
2. Copiar:
   - **Project URL**
   - **anon public** key
3. Abrir `js/supabase-config.js`.
4. Reemplazar:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Guardar archivo.

## 7) Levantar la app local

Usar un servidor local (ejemplo Live Server o similar). Debes entrar por una URL tipo:

- `http://localhost:5500`

No abrir `index.html` con doble click (`file://`) porque rompera flujos de autenticacion.

## 8) Prueba funcional (checklist)

1. Abrir la app.
2. Ir a **Registrarse**.
3. Crear usuario con email y password >= 6.
4. Validar que entra al dashboard.
5. Cerrar sesion.
6. Iniciar sesion con el mismo email/password.
7. En Supabase:
   - **Authentication** -> **Users**: debe aparecer el usuario.
   - **Table Editor** -> `profiles`: debe existir la fila del perfil.
   - **Table Editor** -> `user_app_data`: deben aparecer filas para los tipos usados.

## 8.1) Prueba cross-device (celular/PC/iPad)

1. Iniciar sesion con la misma cuenta en PC.
2. Crear/editar:
   - un entrenamiento,
   - una jugada,
   - una planificacion anual.
3. Cerrar sesion o recargar la pagina (para forzar pull de nube).
4. Iniciar sesion con la misma cuenta en otro dispositivo.
5. Verificar que se ve exactamente el mismo contenido.

Nota: la app usa cache local para offline. Si no hay internet, guarda localmente y sincroniza al reconectar.

## 9) Problemas comunes

### Error: "Supabase no esta configurado"

- Revisar `js/supabase-config.js`.
- Confirmar que URL y anon key no tienen placeholders.

### Error de login aunque el usuario existe

- Si **Confirm email** esta activo, confirmar correo antes de login.
- Revisar que escribiste email correcto (en fase 1 el login es por email).

### Error de red/CORS

- Revisar **Authentication -> URL Configuration**.
- Confirmar que usas exactamente el mismo host/puerto configurado.

### No se crea perfil en `profiles`

- Re-ejecutar `docs/supabase-schema.sql`.
- Verificar RLS/politicas en `public.profiles`.
- Revisar consola del navegador por detalles de error SQL/Auth.

## 10) Alcance de esta fase y siguiente paso

Fase 1 implementa solo usuarios (Auth + `profiles`).

Para Fase 2 (jugadas, entrenamientos, planificacion), recomendacion:

- Crear tablas por dominio con columna `user_id uuid not null references auth.users(id)`.
- Aplicar RLS por `auth.uid() = user_id`.
- Evitar guardar imagenes base64 grandes en filas; usar Supabase Storage y guardar solo metadata/URL en tablas.
