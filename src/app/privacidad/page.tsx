import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Vydre',
}

export default function PrivacidadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Vydre
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Política de Privacidad
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: abril 2026
        </p>

        <div className="prose prose-gray mt-8 max-w-none [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:mt-3 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_ul]:mt-2 [&_ul]:space-y-1 [&_ul]:text-gray-600 [&_li]:list-disc [&_li]:ml-4">
          <h2>1. Quién somos y cómo contactarnos</h2>
          <p>
            Vydre es un proyecto de PulsarMoon, con base en Maldonado, Uruguay.
            Es una herramienta de gestión para profesionales de la salud.
            Los datos personales son tratados conforme a la Ley N° 18.331
            de Protección de Datos Personales y su decreto reglamentario.
            Para consultas de privacidad: {' '}
            <a href="mailto:contacto@vydre.com" className="text-primary underline">
              contacto@vydre.com
            </a>.
          </p>

          <h2>2. Qué datos recopilamos</h2>
          <p>Recopilamos los siguientes tipos de datos:</p>
          <ul>
            <li>
              <strong>Datos del profesional:</strong> nombre, email, teléfono, especialidad,
              horarios de atención y zona horaria.
            </li>
            <li>
              <strong>Datos de pacientes:</strong> nombre, email, teléfono e información
              clínica que el profesional registre durante el uso de la plataforma
              (notas de consulta, resúmenes generados).
            </li>
            <li>
              <strong>Datos de uso:</strong> turnos agendados, consultas realizadas,
              mensajes enviados (recordatorios, resúmenes).
            </li>
            <li>
              <strong>Lista de espera:</strong> nombre, email y especialidad de profesionales
              interesados.
            </li>
            <li>
              <strong>Datos técnicos:</strong> registros de acceso, dirección IP y tipo de
              navegador, recopilados automáticamente para el correcto funcionamiento
              del servicio.
            </li>
          </ul>

          <h2>3. Para qué usamos los datos</h2>
          <p>Los datos se utilizan exclusivamente para:</p>
          <ul>
            <li>Proveer y mejorar los servicios de la plataforma.</li>
            <li>Gestionar agendas, turnos y recordatorios automatizados.</li>
            <li>Generar resúmenes de consulta mediante inteligencia artificial.</li>
            <li>Enviar comunicaciones transaccionales (confirmaciones, recordatorios).</li>
            <li>Administrar la lista de espera para acceso anticipado.</li>
            <li>Mejora del producto (con datos anonimizados).</li>
          </ul>

          <h2>4. Con quién compartimos los datos</h2>
          <p>No vendemos datos a terceros. Compartimos datos únicamente con:</p>
          <ul>
            <li>Proveedores de infraestructura (Supabase, Vercel) para el funcionamiento técnico.</li>
            <li>Servicios de email (Resend) para envío de comunicaciones transaccionales.</li>
            <li>Servicios de IA (Anthropic) para generación de resúmenes — solo el texto
              clínico, sin datos identificatorios del paciente.</li>
            <li>Cuando sea requerido por ley o autoridad competente.</li>
          </ul>

          <h2>5. Ley 18.331 — Protección de Datos Personales</h2>
          <p>
            Vydre cumple con la Ley N° 18.331 de Protección de Datos Personales
            de la República Oriental del Uruguay. Conforme a esta ley, los
            titulares de datos tienen derecho a:
          </p>
          <ul>
            <li>Acceder a sus datos personales.</li>
            <li>Rectificar datos inexactos o incompletos.</li>
            <li>Eliminar datos cuando no sean necesarios para la finalidad (supresión).</li>
            <li>Oponerse al tratamiento en los términos de la ley.</li>
          </ul>
          <p>
            Para ejercer estos derechos, contactá a{' '}
            <a href="mailto:contacto@vydre.com" className="text-primary underline">
              contacto@vydre.com
            </a>.
          </p>

          <h2>6. Retención de datos</h2>
          <p>
            Los datos se conservan mientras la cuenta del profesional esté activa.
            Al eliminar la cuenta, todos los datos asociados se eliminan en un
            plazo de 30 días. Los datos de la lista de espera se eliminan una
            vez que el profesional se registra o solicita su eliminación.
          </p>

          <h2>7. Cookies</h2>
          <p>
            Vydre utiliza únicamente cookies de sesión necesarias para el
            funcionamiento de la plataforma (autenticación y preferencias).
            No utilizamos cookies de tracking, publicidad ni análisis de terceros.
          </p>

          <h2>8. Almacenamiento y seguridad</h2>
          <p>
            Los datos se almacenan en servidores seguros de Supabase con cifrado
            en tránsito (TLS) y en reposo. Implementamos políticas de seguridad
            a nivel de fila (RLS) para garantizar que cada profesional solo pueda
            acceder a sus propios datos y los de sus pacientes.
          </p>

          <h2>9. Procesamiento con IA</h2>
          <p>
            Los resúmenes de consulta se generan utilizando modelos de inteligencia
            artificial (Anthropic Claude). Los datos clínicos se envían de forma
            segura y no son utilizados para entrenar modelos. Los resúmenes pueden
            ser editados por el profesional antes de ser compartidos con el paciente.
          </p>

          <h2>10. Cambios en esta política</h2>
          <p>
            Nos reservamos el derecho de actualizar esta política. Los cambios
            significativos serán comunicados por email a los usuarios registrados.
          </p>

          <h2>11. Contacto</h2>
          <p>
            Para consultas relacionadas con esta política de privacidad o con el
            tratamiento de datos personales, escribinos a{' '}
            <a href="mailto:contacto@vydre.com" className="text-primary underline">
              contacto@vydre.com
            </a>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Vydre</span>
          <div className="flex items-center gap-4">
            <a href="mailto:contacto@vydre.com" className="hover:text-foreground transition-colors">
              contacto@vydre.com
            </a>
            <Link href="/" className="hover:text-foreground transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
