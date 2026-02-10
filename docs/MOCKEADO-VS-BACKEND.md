# Inventario: Mockeado vs Backend

Documento para alinear frontend con backend. Por pantalla/servicio se indica qué está **mockeado** (hardcoded o simulado) y qué **debe venir del backend**.

---

## Servicios compartidos

### ConfigService
- **Origen actual:** URL fija `https://qvdde3mbs8.execute-api.us-east-1.amazonaws.com/dev/config/public`.
- **Mockeado:** La URL no usa `environment.apiUrl`; el backend que devuelve `services` y `creditPlans` es otro API.
- **Backend a tener:** Unificar en un solo dominio/API o exponer `GET /config/public` (o equivalente) en tu API principal y usar `environment.apiUrl`.

### AuthService
- **Backend:** Login llama a URL fija `m587zdkcje.../dev/auth/login`; perfil usa `environment.apiUrl + /user/:id`.
- **Mockeado:** Nada crítico; solo asegurar que login y perfil usen la misma base (ej. `environment.apiUrl`).

### WorkService
- **Backend:** Usa `environment.apiUrl/works` (GET por userId, GET todos, POST, PATCH). Ya integrado.
- **Mockeado:** En errores devuelve `of([])`; no hay datos fake.

### EngineerService
- **Backend:** `environment.apiUrl/engineers`. Ya integrado.
- **Mockeado:** En error devuelve `of([])`.

### PartnerService
- **Backend:** `environment.apiUrl/partners`. Ya integrado.
- **Mockeado:** En error devuelve `of([])`.

### NotificationService
- **Backend:** Ninguno.
- **Mockeado:** Todas las notificaciones son en memoria (se pierden al recargar). Las genera el front (ej. WorkService al detectar obra IN_PROGRESS).
- **Backend a tener (opcional):** Si quieres notificaciones persistentes: `GET /notifications`, `PATCH /notifications/:id/read`, y que el backend envíe eventos (obra iniciada, etc.).

### CartService
- **Backend:** No llama al backend; la cesta es solo localStorage y catálogo de ConfigService.
- **Mockeado:** La cesta en sí es local; los ítems vienen del catálogo (ConfigService → backend de config).

---

## Pantallas

### 1. Home (`/home`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Obras recientes (myWorks) | ✅ Backend | WorkService.getUserWorks() |
| Planes para el stepper / solicitud | ✅ Backend | configService.catalog().creditPlans (si config viene de API) |
| Categorías del dashboard (Electricidad, Plomería, etc.) | ❌ Mock | `categories` y `categorias` hardcodeados en el componente |
| SERVICE_CATEGORIES (select categoría) | ❌ Mock | Array fijo en home.component.ts |
| KPIs supervisor (créditos pendientes, sin ingeniero) | ✅ Backend | workService.works() |
| Visitas de hoy (engineer) | ✅ Backend | workService.works() + engineerId |

**Backend a tener:**
- Categorías de servicio editables: endpoint tipo `GET /config/public` que incluya categorías o un `GET /categories` para reemplazar listas fijas.

---

### 2. Plan Selection / Request (`/request`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Lista de planes (Bronce $1k, Plata $5k, Oro $15k) | ❌ Mock | Array `plans` hardcodeado en plan-selection.component.ts |
| Crear solicitud (POST obra) | ✅ Backend | workService.createCreditRequest() → POST /works |

**Backend a tener:**
- Los planes ya existen en ConfigService (creditPlans desde config/public). El componente **no** los usa; usa un array local. Hay que sustituir `plans` por `configService.catalog()?.creditPlans` y mapear a `CreditPlanOption` (id, name, amount, shortLabel). Si el backend ya devuelve minAmount/maxAmount, usar eso para el monto.

---

### 3. Categorías (`/categories`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Lista de categorías y servicios por categoría | ❌ Mock | Array `categories` hardcodeado (electricidad, plomería, etc. con lista de servicios) |

**Backend a tener:**
- `GET /categories` o incluir en config: categorías con id, nombre, icono, y lista de servicios (o servicios con categoryId). Sustituir el array fijo por la respuesta del backend.

---

### 4. Tracking / Seguimiento (`/tracking`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Obra (workId) | ✅ Backend | workService.myWorks() + query param workId |
| Nombre del ingeniero | ✅ Backend | engineerService.engineers() |
| Pasos del stepper (labels) | ❌ Mock | Constantes TRACKING_STEPS / STATUS_INDEX en el componente (solo UI, no datos) |

No hace falta backend para los labels del stepper; es mapeo fijo de estados. El resto viene del backend.

---

### 5. Presupuestos / Budget (`/budget`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Lista de técnicos/presupuestos | ❌ Mock | Array `budgets` (3 técnicos con nombre, rating, precio, etc.) hardcodeado |
| Selección y “aceptar y programar” | ❌ Mock | Solo navega a /tracking con state; no hay API |

**Backend a tener:**
- Definir si los “presupuestos” son ofertas de técnicos/ingenieros para una obra: ej. `GET /works/:workId/budgets` o `GET /engineers` con disponibilidad.
- Endpoint para “aceptar presupuesto y programar”: ej. `POST /works/:workId/schedule` o asignar ingeniero + fecha.

---

### 6. Chat (`/chat`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Nombre del técnico | ❌ Mock | `technicianName = 'Carlos Rodríguez'` |
| Mensajes | ❌ Mock | Array inicial de 4 mensajes; `sendMessage` añade en local y simula respuesta con setTimeout |

**Backend a tener:**
- Si el chat es por obra: `GET /works/:workId/messages`, `POST /works/:workId/messages`.
- Técnico asignado: puede venir de la obra (engineerId) en lugar de estar fijo.

---

### 7. Rating (`/rating`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Envío de valoración | ❌ Mock | `submit()` solo navega a /home; no envía rating ni comentario a ningún API |

**Backend a tener:**
- `POST /works/:workId/rating` (o `/reviews`) con puntuación y comentario. Llamar antes de navegar a home.

---

### 8. Pagos (`/pagos`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Datos bancarios (cuenta, beneficiario, RIF) | ❌ Mock | Constante BANK_DETAILS en el componente |
| Historial de pagos | ❌ Mock | Array en constructor (3 ítems fake) |
| Próxima cuota (monto y fecha) | ❌ Mock | `nextDue` con valores fijos |
| Envío del formulario de pago | ❌ Mock | TODO en código: “enviar a API (tipo, monto, referencia, fecha, archivo)” |

**Backend a tener:**
- `GET /payments` o `GET /user/:id/payments`: historial de pagos.
- `GET /user/:id/next-due` o incluir en perfil/crédito: próxima cuota y fecha.
- Config de datos bancarios: `GET /config/public` (o similar) para mostrar cuenta de transferencia.
- `POST /payments` (o `/upload-proof`): tipo, monto, referencia, fecha, comprobante (archivo).

---

### 9. Financiación (`/financing`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Planes (RENOEXPRESS, RENOSTANDAR, RENOAMPLIADO) | ❌ Mock | Array `financingPlans` hardcodeado en el componente |
| Cálculo cuota (enganche, cuotas) | Solo cliente | Fórmula en front; no guarda en backend hasta enviar formulario |

**Backend a tener:**
- Planes de financiación: pueden venir de config (ej. mismo `GET /config/public` con `financingPlans`) para no tener rangos y textos en el código.

---

### 10. Formulario de financiación (`/financing-form`)
| Qué | Estado | Notas |
|-----|--------|--------|
| requestId | ❌ Mock | `Math.floor(10000 + Math.random() * 90000)` |
| Envío del formulario | ❌ Mock | `onSubmit()` solo pone `submitted.set(true)`; no hay POST |

**Backend a tener:**
- `POST /financing-requests` (o similar) con datos del formulario y archivos; el backend debe devolver un id de solicitud (y usarlo en lugar del random).

---

### 11. Solicitar Servicio / Service Request (`/service-request`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Categoría y servicio | Estado de navegación | Viene de /categories vía state |
| Descripción y “archivos” | Solo front | addFile solo añade un string; no sube archivos |
| submit() | ❌ Mock | Solo navega a /budget con state; no crea obra ni solicitud en backend |

**Backend a tener:**
- Decidir si este flujo crea una “solicitud” o “obra” en el backend (ej. POST con descripción y adjuntos) o si solo es un flujo hacia presupuestos; luego conectar submit con ese endpoint.

---

### 12. Servicios / Listado de obras (`/servicios`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Obras del usuario | ✅ Backend | workService.myWorks() |
| Catálogo de servicios (búsqueda) | ✅ Backend | configService.catalog()?.services |
| categorias (badges/iconos) | ❌ Mock | Array local en el componente; solo decorativo |

Servicios y obras ya vienen del backend; solo las categorías visuales son fijas.

---

### 13. Resumen / Summary (`/resumen`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Items del carrito | ConfigService | catalog().services + CartService (localStorage) |
| confirmAndSend() | ⚠️ Híbrido | POST a URL fija `https://s6txacomrf.../dev/works` (debería usar `environment.apiUrl + '/works'`); payload con `ubicacion: 'Por definir'` (TODO en código) |

**Backend a tener:**
- Usar `environment.apiUrl` para el POST (mismo que WorkService).
- Añadir campo de ubicación en el formulario y enviarlo en el payload en lugar de “Por definir”.

---

### 14. Request Success (`/request-success`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Nombre del plan | Query param | plan/planName en la URL |
| Confeti | Solo UI | Generado en el componente |

Nada que mockear; solo leer query y mostrar. Opcional: si en el futuro se muestra más detalle de la solicitud, podría venir de `GET /works/:id` recién creada.

---

### 15. Perfil (`/profile`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Usuario actual | ✅ Backend | AuthService (login + loadUserProfile) |
| Perfil financiero (score, moroso, badge) | ✅ Backend | userProfile desde GET /user/:id |
| Obras (myWorks) | ✅ Backend | workService.getUserWorks() |
| Notificaciones | ❌ Solo memoria | NotificationService (en memoria) |

Si se quieren notificaciones persistentes, ver NotificationService arriba.

---

### 16. Admin / Supervisor (`/supervisor`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Lista de obras (todas) | ✅ Backend | workService.getAllWorks() |
| Lista de ingenieros | ✅ Backend | engineerService.getEngineers() |
| Aprobar/rechazar, asignar ingeniero | ✅ Backend | workService (PATCH) |

Todo el flujo supervisor ya usa backend.

---

### 17. Engineer Dashboard (`/engineer`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Obras asignadas al ingeniero | ✅ Backend | workService.getWorksByEngineerId() |
| Etiquetas de estado/plan | Solo UI | Mapeo local |

Todo crítico viene del backend.

---

### 18. Calculadora técnica / Engineer Visit (`/engineer/visit/:workId`)
| Qué | Estado | Notas |
|-----|--------|--------|
| Obra (workId) | ✅ Backend | workService.works() |
| Materiales (catálogo) | ✅ Backend | configService.catalog()?.services |
| Partners por material | ✅ Backend | partnerService (backend devuelve partners; getPartnersByMaterialSync usa esa lista) |
| Límite del plan (monto) | Híbrido | work.planAmount del backend o fallback local BRONZE/SILVER/GOLD |
| Envío a partners / iniciar obra | ✅ Backend | workService (PATCH) |

Todo el flujo técnico está conectado al backend; solo el fallback de planLimit es local.

---

### 19. Login / Register
- **Login:** URL de API hardcodeada (`m587zdkcje.../dev/auth/login`). Ideal: usar `environment.apiUrl + '/auth/login'` si el mismo backend expone auth.
- **Register:** Revisar si usa URL fija o `environment.apiUrl`; mismo criterio que login.

---

## Resumen de prioridades para el backend

1. **Pagos:** Historial, próxima cuota, datos bancarios (config), y POST para envío de pago + comprobante.
2. **Rating:** POST valoración por obra (workId, rating, comentario).
3. **Chat:** Mensajes por obra (GET/POST) y técnico desde obra (engineerId).
4. **Presupuestos:** Origen de la lista de técnicos/presupuestos y endpoint para aceptar/programar.
5. **Plan Selection:** Usar `creditPlans` del config en lugar del array hardcodeado; unificar config en una sola API si hace falta.
6. **Categorías (Home y Categories):** Categorías y servicios desde backend (config o endpoints dedicados).
7. **Financiación:** Planes desde config; POST solicitud de financiación con id devuelto por backend.
8. **Service Request:** Decidir modelo (¿crea obra/solicitud?) y conectar submit a API.
9. **Resumen:** Usar `environment.apiUrl` y añadir ubicación al payload.
10. **URLs:** Unificar auth, config y works en `environment.apiUrl` (o documentar las distintas APIs si son intencionales).
11. **Notificaciones (opcional):** Endpoints de notificaciones persistentes si se quieren conservar entre sesiones.

Si quieres, el siguiente paso puede ser: (1) implementar en backend los endpoints de Pagos y Rating, y (2) en frontend reemplazar los mocks de Home/Categories/Plan Selection por datos del config o nuevos endpoints.

---

## ✅ Hecho (implementado)

- **Backend Rating:** En work-service se añadieron `rating`, `ratingComment`, `ratedAt` al modelo Work y al PATCH `/works/:id`. El cliente puede enviar solo `{ rating, ratingComment }` para su propia obra.
- **Backend Pagos:** En work-service: tabla `Payments` (PK=USER#userId, SK=PAYMENT#date#uuid), handlers `GET /payments`, `POST /payments`, `GET /payments/next-due`. Next-due se calcula a partir de la primera obra activa del usuario (planAmount/12).
- **Backend Config:** En config-service, `getPublicConfig` ahora incluye `bankDetails` (lectura de ítem CONFIG#BANK). Para que el front reciba datos bancarios hay que insertar en la tabla Config un ítem con PK=`CONFIG`, SK=`BANK` y atributos: bankName, accountType, accountNumber, beneficiary, rif, referenceFormat.
- **Frontend Plan Selection:** Usa `configService.catalog()?.creditPlans`; si no hay catalog, fallback a planes Bronce/Plata/Oro hardcodeados.
- **Frontend Home:** Categorías derivadas del config (servicios agrupados por category) con fallback; mismo para `categorias` (legacy).
- **Frontend Categories:** Lista de categorías y servicios desde `configService.catalog()?.services` agrupados por category, con fallback.
- **Frontend Pagos:** `PaymentsService` para GET payments, GET next-due, POST payment. Datos bancarios desde `configService.catalog()?.bankDetails` con fallback.
- **Frontend Rating:** `workService.submitRating(workId, rating, comment)` con workId desde `history.state`; mensaje de error y estado de envío en la UI.

---

## Qué sigue por sincronizar (pendiente)

| Prioridad | Área | Qué falta |
|-----------|------|-----------|
| Alta | **Pagos** | Comprobante de pago (imagen): subir archivo y guardar referencia en el pago. |
| Media | **Chat** | Mensajes por obra (GET/POST), nombre del técnico desde obra (engineerId). |
| Media | **Presupuestos** | Origen de la lista de técnicos (API), endpoint para aceptar/programar. |
| Media | **Financiación** | Planes desde config (opcional), POST solicitud de financiación con id. |
| Baja | **Service Request** | Decidir si crea obra/solicitud y conectar submit a API. |
| Baja | **Resumen** | Usar `environment.apiUrl` y campo ubicación en el payload. |
| Baja | **URLs** | Unificar auth/config en una sola API base si se desea. |
| Opcional | **Notificaciones** | Persistir en backend y sincronizar al abrir la app. |

---

## Comprobante de pago (imagen): cómo soportarlo

Las imágenes no conviene guardarlas en DynamoDB (tamaño, coste). La opción habitual es **objeto storage (S3)** y en el pago guardar solo la **referencia** (URL o clave).

### Opción A – Presigned URL (recomendada)

1. **Backend (work-service)**  
   - Crear bucket S3 (o uno compartido) para comprobantes.  
   - Nuevo endpoint **GET /payments/upload-url** (o POST): con el token del usuario devuelve una **presigned URL** de S3 (PUT) y una **key** única (ej. `proofs/{userId}/{paymentId}.jpg`).  
   - **POST /payments** acepta un campo opcional **proofKey** (string). Si viene, se guarda en el ítem de pago en DynamoDB.  
   - Opcional: endpoint o lógica para generar presigned GET y así poder “ver” el comprobante desde el front (o desde un panel admin).

2. **Frontend**  
   - Al enviar el pago: si el usuario eligió imagen, primero llamar GET /payments/upload-url, hacer **PUT del archivo** a la URL devuelta, luego **POST /payments** con `proofKey` (y el resto: amount, type, reference, date).  
   - El comprobante queda en S3; en DynamoDB solo la key (o la URL pública si el bucket es público, no recomendado para datos sensibles).

Ventajas: Lambda no recibe el archivo (límite 6 MB), escalable y estándar en AWS.

### Opción B – Multipart / base64 en Lambda

- **POST /payments** recibe multipart (archivo + campos) o JSON con imagen en base64.  
- La Lambda sube el archivo a S3 y guarda la key en el ítem de pago.  
- Limitación: tamaño del body (ej. 6 MB en API Gateway). Para fotos de móvil comprimidas suele bastar; para escaneos grandes la Opción A es mejor.

### Resumen práctico

- Añadir en el ítem de pago un campo **proofKey** (string, opcional).  
- Implementar **presigned URL** (GET /payments/upload-url) en work-service y subida desde el front a S3; luego POST /payments con **proofKey**.  
- Para ver el comprobante después: otro endpoint que, dado un paymentId (y comprobando que el usuario es el dueño), genere una presigned GET a la key guardada.

### ✅ Implementado (presigned URL)

- **Backend (work-service):**
  - Bucket S3 `PaymentProofsBucket` (privado), IAM PutObject/GetObject.
  - **GET /payments/upload-url?ext=jpg** (ext opcional: jpg, jpeg, png, pdf): devuelve `{ uploadUrl, key }` (presigned PUT, 5 min).
  - **POST /payments** acepta cuerpo opcional **proofKey** (string que debe empezar por `proofs/`); se guarda en el ítem de pago.
  - **GET /payments/proof-url?key=xxx**: devuelve `{ viewUrl }` (presigned GET) si el usuario es **dueño** de la key (`proofs/{userId}/...`) o tiene rol **SUPERVISOR** (puede ver cualquier comprobante); si no, 403.
  - **GET /payments** incluye **proofKey** en cada ítem cuando existe.
- **Frontend:**
  - `PaymentsService.getUploadUrl(ext?)`, `getProofViewUrl(proofKey)`.
  - En Pagos: al enviar pago con archivo adjunto, se pide upload-url, se hace PUT del archivo a S3, luego POST /payments con **proofKey**.
  - En el historial, enlace "Ver comprobante" cuando el pago tiene proofKey (abre la viewUrl en nueva pestaña).
