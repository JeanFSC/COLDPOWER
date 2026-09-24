export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  description: string;
  lastReview: string;
  sections: LegalSection[];
  relatedLinks?: Array<{ label: string; href: string }>;
};

const reviewNotice = "Documento en revisión legal. Completa los campos [DEFINIR] y valida el texto antes de activar su publicación.";

export const legalDocuments = {
  terms: {
    title: "Términos y condiciones",
    description: "Condiciones de uso del catálogo, las cotizaciones, la compra y la atención comercial de ColdPower.",
    lastReview: "Borrador pendiente de validación legal",
    sections: [
      {
        title: "1. Identificación y estado del documento",
        paragraphs: [
          "Estos términos regulan el uso del sitio web ColdPower, su catálogo técnico, los formularios de contacto y cotización, la cuenta de cliente y el flujo de compra que la plataforma habilite.",
          "El proveedor es [DEFINIR: razón social], con RUC [DEFINIR] y domicilio en [DEFINIR]. El correo para comunicaciones legales es [DEFINIR]. Este texto es un borrador en revisión legal y no debe considerarse versión definitiva mientras conserve campos [DEFINIR].",
        ],
      },
      {
        title: "2. Alcance y aceptación",
        paragraphs: [
          "Al navegar, crear una cuenta, solicitar una cotización o iniciar una compra, la persona usuaria declara que revisó estas condiciones y que utilizará el sitio de forma lícita. Si no está de acuerdo, debe abstenerse de utilizar las funciones correspondientes.",
          "ColdPower puede actualizar estas condiciones cuando exista un cambio operativo, legal o comercial. La versión aplicable a una operación será la que se muestre al momento de confirmarla, sin afectar derechos que la ley reconozca de forma imperativa.",
        ],
      },
      {
        title: "3. Catálogo, fichas técnicas, precios y disponibilidad",
        paragraphs: [
          "El catálogo organiza productos por categoría, familia y producto. Las fichas pueden incluir SKU, marca, modelo, aplicación, refrigerante, voltaje, potencia, capacitancia, dimensiones y otros datos de la fuente comercial disponible. La información técnica debe verificarse antes de instalar o comprar una pieza.",
          "Un producto marcado como «bajo cotización» no constituye por sí solo una oferta irrevocable ni garantiza precio, stock o compatibilidad. El precio, la moneda, los impuestos que correspondan, la disponibilidad y el plazo se confirmarán en la cotización o pedido emitido por ColdPower.",
          "El stock y el precio se validan en el servidor al crear el pedido. La publicación de una ficha no reserva unidades ni impide que exista una actualización de inventario antes de la confirmación.",
        ],
      },
      {
        title: "4. Cotizaciones",
        paragraphs: [
          "Una solicitud de cotización es una petición comercial, no una compra ni una aceptación automática de precio. Para atenderla, ColdPower puede solicitar datos de contacto, ubicación, SKU, modelo, aplicación y requisitos técnicos.",
          "La cotización final indicará, cuando corresponda, productos, cantidades, moneda, precio, vigencia, disponibilidad, entrega, medio de pago y cualquier condición particular. La operación solo se considerará confirmada cuando el canal comercial autorizado acepte la cotización y se cumplan las condiciones indicadas.",
        ],
      },
      {
        title: "5. Cuenta, carrito y pedido",
        paragraphs: [
          "El flujo de compra requiere una cuenta autenticada. La persona usuaria debe mantener sus datos de acceso bajo control y comunicar cualquier uso no autorizado. ColdPower puede suspender una cuenta cuando existan señales razonables de fraude, abuso o incumplimiento, respetando las obligaciones legales aplicables.",
          "El pedido se construye a partir del carrito y de los datos de entrega ingresados. La plataforma conserva una instantánea comercial de los productos, precios, moneda y datos necesarios para atender la operación. La creación del pedido y la reserva temporal de stock no equivalen a que el pago haya sido aprobado.",
          "Si el pago no se completa o el proveedor de pago no confirma la operación, el pedido puede permanecer pendiente para reintento o quedar cancelado según su estado. La plataforma mostrará el resultado disponible y el canal de atención podrá confirmar la situación.",
        ],
      },
      {
        title: "6. Entrega, recojo y datos de despacho",
        paragraphs: [
          "Las modalidades disponibles pueden ser recojo en un local, delivery en Lima o envío a provincia. El costo y el tiempo de entrega se coordinan según ubicación, agencia, disponibilidad y características del pedido; no se considerarán confirmados hasta que aparezcan en la cotización o pedido.",
          "Para atender el despacho se pueden solicitar dirección, distrito, referencia, departamento, provincia, agencia, dirección de agencia, nombre de la persona receptora y DNI, según la modalidad elegida. La persona usuaria debe entregar datos correctos y contar con las autorizaciones necesarias para recibir el pedido.",
        ],
      },
      {
        title: "7. Pagos",
        paragraphs: [
          "Los medios de pago y sus condiciones se informarán antes de confirmar la operación. El entorno de desarrollo puede utilizar un proveedor simulado; el proveedor comercial, las comisiones, los plazos de abono y el tratamiento final de datos de pago quedan [DEFINIR] antes de publicar una versión definitiva.",
          "ColdPower no solicitará contraseñas, códigos de seguridad ni datos completos de tarjetas por canales no autorizados. La confirmación del pago depende del proveedor correspondiente y de la conciliación de la operación.",
        ],
      },
      {
        title: "8. Garantía, cambios y devoluciones",
        paragraphs: [
          "Las condiciones para repuestos eléctricos, electrónicos y otros productos dependen de la pieza, del proveedor y de la legislación aplicable. Los requisitos de garantía, cambios, devoluciones, plazos y costos se desarrollan en la política de cambios y devoluciones, que conserva campos [DEFINIR] mientras está en revisión.",
          "La persona compradora debe revisar SKU, modelo, voltaje, potencia, capacitancia, dimensiones, refrigerante y aplicación antes de instalar o energizar la pieza. Una recomendación de producto relacionado no es una declaración de compatibilidad.",
        ],
      },
      {
        title: "9. Uso permitido y responsabilidad de la persona usuaria",
        bullets: [
          "Proporcionar información veraz, actualizada y suficiente para cotizar, vender, entregar y atender la operación.",
          "No utilizar el sitio para fraude, scraping abusivo, suplantación, distribución de malware, acceso no autorizado o afectación deliberada de otros usuarios.",
          "Solicitar revisión técnica cuando exista duda de compatibilidad y realizar la instalación con personal competente, siguiendo las instrucciones del fabricante.",
          "Conservar comprobantes, cotizaciones y comunicaciones relevantes para facilitar el soporte posterior.",
        ],
      },
      {
        title: "10. Disponibilidad del servicio y límites de responsabilidad",
        paragraphs: [
          "ColdPower aplicará medidas razonables para mantener el sitio y registrar las operaciones, pero pueden producirse interrupciones por mantenimiento, conectividad, servicios externos, fuerza mayor o eventos fuera de su control. Se informarán las incidencias relevantes cuando resulte posible.",
          "La información del catálogo no reemplaza la evaluación de un técnico ni las especificaciones del fabricante. Ninguna limitación de responsabilidad se interpretará como renuncia a derechos irrenunciables, garantías legales o responsabilidades que no puedan excluirse por ley.",
        ],
      },
      {
        title: "11. Libro de reclamaciones",
        paragraphs: [
          "La persona consumidora puede presentar una queja o reclamo en el Libro de reclamaciones virtual. El sistema genera un código de seguimiento y el caso se atiende dentro del plazo legal vigente; para esta versión se toma como referencia el plazo de quince días hábiles no prorrogables, sujeto a la normativa aplicable al caso.",
        ],
      },
      {
        title: "12. Ley aplicable y contacto",
        paragraphs: [
          "Estos términos se interpretan conforme a la legislación peruana, sin perjuicio de los derechos que correspondan a consumidores y usuarios. La dirección, el correo legal y los datos completos del proveedor quedan [DEFINIR].",
        ],
      },
    ],
    relatedLinks: [
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Cambios y devoluciones", href: "/cambios-y-devoluciones" },
      { label: "Libro de reclamaciones", href: "/libro-de-reclamaciones" },
    ],
  },
  privacy: {
    title: "Política de privacidad",
    description: "Cómo ColdPower recopila, utiliza, conserva y protege los datos personales de sus usuarios y clientes.",
    lastReview: "Borrador pendiente de validación legal",
    sections: [
      {
        title: "1. Responsable y estado del documento",
        paragraphs: [
          "El responsable del tratamiento es [DEFINIR: razón social], RUC [DEFINIR], con domicilio en [DEFINIR] y correo de privacidad [DEFINIR]. Esta política se encuentra en revisión legal y conserva campos [DEFINIR] que deben completarse antes de su aprobación.",
          "El tratamiento se plantea conforme a la Ley N.º 29733, Ley de Protección de Datos Personales, y al Reglamento aprobado por el Decreto Supremo N.º 016-2024-JUS, además de las normas que los modifiquen o sustituyan.",
        ],
      },
      {
        title: "2. Datos que puede recopilar ColdPower",
        bullets: [
          "Cuenta y autenticación: correo, nombre, identificadores de autenticación, estado de la cuenta, rol operativo cuando corresponda, teléfono y fecha del último acceso.",
          "Perfil y relación comercial: empresa, documento o RUC, teléfono, WhatsApp, correo, dirección, ubicación y preferencia de contacto.",
          "Cotizaciones: nombre, tipo de cliente, DNI o RUC, teléfono, correo opcional, departamento, provincia, distrito, contacto preferido, SKU o producto, mensaje, consentimiento, IP, sesión y marcas de tiempo.",
          "Contacto: nombre, empresa opcional, teléfono, correo, mensaje, SKU o referencia, consentimiento, identificador de solicitud, IP y, si la persona lo adjunta, un archivo JPG, PNG, WEBP o PDF dentro del límite informado por el formulario.",
          "Newsletter: correo, estado de suscripción, origen, consentimiento y fechas de alta o actualización.",
          "Compra y despacho: nombre, teléfono, correo, modalidad de entrega, local, dirección, distrito, departamento, provincia, agencia, persona receptora, DNI, estado del pedido, reserva y pago.",
          "Libro de reclamaciones: nombre, tipo y número de documento, correo, teléfono, domicilio, tipo de caso, detalle, referencia del producto, código de seguimiento y marcas de tiempo.",
          "Operación y seguridad: IP, agente de usuario, identificadores de solicitud, registros de rate limit, eventos técnicos y eventos de navegación del catálogo necesarios para operar y medir el servicio.",
        ],
      },
      {
        title: "3. Fuentes de los datos",
        paragraphs: [
          "Los datos provienen de la persona titular, de la cuenta autenticada, de la información que ingresa en formularios y checkout, de la operación comercial y de registros técnicos generados al utilizar el sitio. Si una empresa entrega datos de su personal o de una persona receptora, declara contar con una base válida para comunicarlos.",
        ],
      },
      {
        title: "4. Finalidades y bases del tratamiento",
        bullets: [
          "Atender consultas, cotizaciones, pedidos, entregas, pagos, garantías y soporte precontractual o contractual.",
          "Crear y administrar cuentas, autenticar usuarios, mantener el historial comercial y ejecutar controles de seguridad.",
          "Responder quejas y reclamos, cumplir obligaciones legales y demostrar la trazabilidad de la atención.",
          "Enviar newsletter o comunicaciones comerciales cuando exista consentimiento u otra base habilitante; la persona puede retirar su consentimiento.",
          "Prevenir fraude, abuso, accesos indebidos e incidentes, y mantener la disponibilidad y calidad técnica del servicio.",
          "Medir el uso del catálogo y mejorar la experiencia con eventos técnicos y analítica limitada, conforme a la configuración de privacidad aplicable.",
        ],
      },
      {
        title: "5. Encargados, proveedores y transferencias",
        paragraphs: [
          "ColdPower puede utilizar proveedores necesarios para operar el servicio, como Clerk para autenticación, PostgreSQL/Neon para persistencia configurada en el entorno correspondiente, el proveedor de pagos que se defina y proveedores técnicos de almacenamiento o notificación que se [DEFINIR]. El entorno local puede usar servicios simulados y no representa por sí solo el proveedor comercial final.",
          "También pueden acceder a los datos el personal autorizado que necesita atender la operación, auditores y autoridades competentes cuando exista una obligación legal. ColdPower no vende datos personales.",
        ],
      },
      {
        title: "6. Transferencias internacionales",
        paragraphs: [
          "Los países de destino, categorías de datos, garantías, contratos y mecanismos aplicables a transferencias internacionales quedan [DEFINIR] luego de confirmar la arquitectura comercial y los proveedores definitivos. Antes de publicar la versión aprobada deberá completarse esta sección con información verificable.",
        ],
      },
      {
        title: "7. Conservación",
        paragraphs: [
          "Los periodos exactos de conservación por categoría quedan [DEFINIR]. Como criterio operativo, los registros de cuenta, pedidos, pagos, cotizaciones, atención al cliente y reclamos se conservarán durante el tiempo necesario para ejecutar la relación, atender garantías, cumplir obligaciones y defender derechos. La suscripción a newsletter se conservará hasta la baja o mientras exista una base válida. La retención de adjuntos queda [DEFINIR].",
        ],
      },
      {
        title: "8. Derechos ARCO y atención de solicitudes",
        paragraphs: [
          "La persona titular puede ejercer los derechos de acceso, rectificación, cancelación y oposición, además de los derechos que reconozca la normativa vigente, mediante [DEFINIR: canal de privacidad]. La solicitud debe permitir verificar la identidad y, cuando corresponda, la representación.",
          "Como referencia operativa del Reglamento vigente, las solicitudes de acceso se atienden en veinte días calendario y las de rectificación, cancelación u oposición en diez días calendario; la información tiene un plazo de ocho días calendario. Puede existir una ampliación justificada y comunicada en los casos permitidos por ley.",
          "Si la persona considera que su solicitud no fue atendida correctamente, puede acudir a la Autoridad Nacional de Protección de Datos Personales conforme al procedimiento aplicable.",
        ],
      },
      {
        title: "9. Seguridad e incidentes",
        paragraphs: [
          "ColdPower aplica controles razonables según el riesgo, como autenticación, permisos por rol, validación server-side, trazabilidad de operaciones, control de concurrencia y medidas de disponibilidad. Ningún servicio conectado a internet es absolutamente invulnerable.",
          "La gestión y comunicación de incidentes se realizará conforme a la normativa vigente y a la evaluación del caso. Los datos de contacto y el procedimiento interno específico quedan [DEFINIR].",
        ],
      },
      {
        title: "10. Cookies y analítica",
        paragraphs: [
          "El sitio puede utilizar tecnologías necesarias para autenticación, seguridad, preferencias y funcionamiento. También puede registrar eventos técnicos del catálogo para mejorar el servicio. La lista de cookies, tecnologías no esenciales, proveedores, duración y mecanismo de consentimiento queda [DEFINIR] y debe validarse antes de la publicación definitiva.",
        ],
      },
      {
        title: "11. Menores, cambios y contacto",
        paragraphs: [
          "El servicio comercial está dirigido a personas con capacidad para contratar. Si una persona menor utiliza un formulario, debe hacerlo con la autorización y supervisión de quien ejerza la responsabilidad correspondiente.",
          "ColdPower puede modificar esta política para reflejar cambios legales, técnicos o comerciales. La versión vigente se publicará en esta ruta y se indicará la fecha de revisión. Consultas y solicitudes: [DEFINIR].",
        ],
      },
    ],
    relatedLinks: [
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Libro de reclamaciones", href: "/libro-de-reclamaciones" },
    ],
  },
  returns: {
    title: "Cambios y devoluciones",
    description: "Borrador de condiciones para garantía, cambios y devoluciones de repuestos eléctricos, electrónicos y productos relacionados.",
    lastReview: "Borrador pendiente de validación legal",
    sections: [
      {
        title: "1. Alcance e identificación",
        paragraphs: [
          "Esta política se propone para repuestos eléctricos y electrónicos de refrigeración, aire acondicionado y línea blanca, además de los productos relacionados que ColdPower comercialice. El proveedor es [DEFINIR: razón social], RUC [DEFINIR], domicilio [DEFINIR] y canal de postventa [DEFINIR].",
          "El texto es un borrador en revisión legal. Los plazos, coberturas, responsables y costos marcados como [DEFINIR] deben ser completados y aprobados antes de activar la publicación.",
        ],
      },
      {
        title: "2. Verificación antes de comprar o instalar",
        paragraphs: [
          "Antes de confirmar una compra, la persona usuaria debe revisar SKU, marca, modelo, aplicación, voltaje, potencia, capacitancia, dimensiones, refrigerante, conectores y cualquier especificación relevante. Cuando exista duda, debe solicitar confirmación a un asesor técnico.",
          "Una sugerencia de la misma familia o un producto relacionado no constituye una declaración de compatibilidad. La compatibilidad solo debe afirmarse cuando exista una relación explícita y validada para el producto concreto.",
        ],
      },
      {
        title: "3. Garantía",
        paragraphs: [
          "La duración de la garantía es [DEFINIR] y su responsable es [DEFINIR: ColdPower, fabricante o proveedor]. El plazo empieza [DEFINIR: fecha de entrega, instalación u otro evento verificable]. La cobertura, documentos requeridos y resultado posible deben definirse por categoría de producto y conforme a la ley.",
          "La garantía no sustituye los derechos mínimos que correspondan a la persona consumidora. Ninguna condición de esta política pretende excluir responsabilidades legales no disponibles.",
        ],
      },
      {
        title: "4. Plazo y canal para solicitar atención",
        paragraphs: [
          "El plazo para solicitar cambio, devolución o garantía es [DEFINIR]. La solicitud se presenta por [DEFINIR: canal] indicando número de pedido o cotización, SKU, fecha, motivo, datos de contacto y evidencia disponible. ColdPower entregará un código de caso cuando el canal esté confirmado.",
        ],
      },
      {
        title: "5. Condiciones de revisión de piezas eléctricas y electrónicas",
        bullets: [
          "Producto completo, con accesorios, etiquetas, número de serie y empaque cuando corresponda.",
          "Comprobante de compra, pedido o cotización vinculada a la pieza.",
          "Sin señales de instalación, energización, reparación, soldadura, apertura, manipulación o modificación no autorizada, salvo que la evaluación legal o técnica determine lo contrario.",
          "Evidencia fotográfica y descripción de la falla o diferencia, sin desarmar el producto ni exponerse a riesgos eléctricos.",
          "Entrega o coordinación del producto siguiendo las instrucciones del canal autorizado.",
        ],
      },
      {
        title: "6. Exclusiones por definir",
        paragraphs: [
          "Las exclusiones concretas quedan [DEFINIR] y solo serán aplicables en la medida permitida por ley. Podrían evaluarse, entre otros supuestos, daño por instalación incorrecta, uso fuera de especificación, sobrevoltaje, humedad, desgaste, manipulación, incompatibilidad informada de forma incorrecta o intervención de terceros; cada supuesto requiere validación técnica y legal.",
        ],
      },
      {
        title: "7. Evaluación y resultado",
        paragraphs: [
          "El procedimiento de inspección, responsable técnico, plazo de diagnóstico y comunicación del resultado quedan [DEFINIR]. Según el caso y la ley aplicable, el resultado podría ser reparación, cambio, reposición, devolución o una respuesta motivada, sin anticipar una decisión antes de revisar el producto y sus antecedentes.",
        ],
      },
      {
        title: "8. Transporte y costos",
        paragraphs: [
          "Los costos de recojo, envío, diagnóstico y devolución quedan [DEFINIR] por modalidad: recojo en local, delivery en Lima o envío a provincia. La persona usuaria no debe remitir una pieza sin instrucciones del canal autorizado ni asumir un costo que no haya sido informado.",
        ],
      },
      {
        title: "9. Reembolsos",
        paragraphs: [
          "La procedencia del reembolso, su plazo, medio de devolución, tratamiento de comisiones y documentación requerida quedan [DEFINIR]. Cuando corresponda, el reembolso se realizará mediante el medio de pago original o por el mecanismo acordado y permitido por ley.",
        ],
      },
      {
        title: "10. Quejas, reclamos y contacto",
        paragraphs: [
          "Una solicitud de cambio o garantía no limita el derecho a presentar una queja o reclamo en el Libro de reclamaciones. El canal de postventa, el horario y el responsable de atención quedan [DEFINIR].",
        ],
      },
    ],
    relatedLinks: [
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Libro de reclamaciones", href: "/libro-de-reclamaciones" },
    ],
  },
} satisfies Record<string, LegalDocument>;

export { reviewNotice };
