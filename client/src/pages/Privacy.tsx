export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Politica de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-8">Ultima actualizacion: Enero 2026</p>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Informacion que Recopilamos</h2>
            <p>
              CRM Personal recopila y almacena informacion de contactos que tu proporcionas, incluyendo:
              nombres, numeros de telefono, direcciones de correo electronico, y notas de conversaciones.
              Esta informacion se utiliza exclusivamente para la gestion de tus relaciones comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Uso de la Informacion</h2>
            <p>La informacion recopilada se utiliza para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Gestionar y organizar tus contactos</li>
              <li>Facilitar la comunicacion via WhatsApp y correo electronico</li>
              <li>Registrar el historial de conversaciones</li>
              <li>Sincronizar datos con Google Sheets (cuando se autoriza)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Integracion con WhatsApp</h2>
            <p>
              Este CRM utiliza la API de WhatsApp Business para enviar y recibir mensajes.
              Los mensajes enviados a traves de esta plataforma estan sujetos a las politicas
              de privacidad de WhatsApp/Meta. Solo se procesan mensajes de contactos que tu
              agregas al sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Almacenamiento de Datos</h2>
            <p>
              Tus datos se almacenan de forma segura en servidores de Fly.io.
              No compartimos tu informacion con terceros, excepto los servicios
              necesarios para el funcionamiento de la aplicacion (Google, WhatsApp/Meta).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Tus Derechos</h2>
            <p>Tienes derecho a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Acceder a tus datos almacenados</li>
              <li>Modificar o eliminar tu informacion</li>
              <li>Exportar tus datos</li>
              <li>Revocar permisos de integraciones</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contacto</h2>
            <p>
              Para preguntas sobre esta politica de privacidad o el manejo de tus datos,
              contacta al administrador del sistema.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
