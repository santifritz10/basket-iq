/**
 * Layout de pantalla completa para el espacio de trabajo del asistente:
 * sin el encabezado de las otras páginas, para que la barra lateral y el
 * chat ocupen todo el alto disponible.
 */
export default function WorkspaceLayout({ children }) {
  return <div style={{ height: "100dvh", overflow: "hidden" }}>{children}</div>;
}
