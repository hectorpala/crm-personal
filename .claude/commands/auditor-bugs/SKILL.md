---
name: auditor-bugs
description: Auditar CRM completo (frontend + backend). Usar con "revisar", "auditar", "errores", "bugs", "regresiones", "code review", "whatsapp", "crm".
---

# Auditor de Bugs - CRM

Realiza un code review completo del CRM para detectar errores, riesgos y regresiones.

## Proceso de Auditoria

### 1. Mapear estructura del proyecto
```bash
rg -l "export|import" --type ts | head -50
```
Identifica: rutas API, servicios, componentes UI, esquemas DB.

### 2. Revisar por capas

**Backend (server/):**
- Rutas/endpoints: validacion de inputs, status codes, manejo de errores
- Servicios: logica de negocio, edge cases, null checks
- DB/Schema: tipos, relaciones, migraciones pendientes
- Duplicacion de codigo entre archivos similares

**Frontend (client/):**
- Componentes: props requeridas, estados de error/loading
- Hooks/queries: manejo de errores, estados de carga
- Formularios: validaciones, sanitizacion
- Consistencia con API (campos, tipos, endpoints)

### 3. Buscar patrones problematicos
```bash
rg "catch.*\{\s*\}" --type ts          # catches vacios
rg "TODO|FIXME|HACK|XXX" --type ts     # deuda tecnica
rg "console\.(log|error)" --type ts    # logs en produccion
rg "any" --type ts                      # tipos any
rg "\!\." --type ts                     # non-null assertions
```

### 4. Validar flujos criticos
- Autenticacion/autorizacion
- Transacciones de datos (crear, actualizar, eliminar)
- Integraciones externas (WhatsApp, APIs)
- Manejo de archivos/media

## Formato de Salida

### HALLAZGOS (ordenados por severidad)

```
[CRITICO] #1 - Titulo breve
Archivo: ruta/archivo.ts:123-145
Descripcion: ...
Impacto: ...

[ALTO] #2 - Titulo breve
Archivo: ruta/archivo.ts:67
Descripcion: ...

[MEDIO] #3 - ...

[BAJO] #4 - ...
```

Severidades:
- CRITICO: Perdida de datos, seguridad, crash en produccion
- ALTO: Funcionalidad rota, UX muy degradada
- MEDIO: Bugs menores, inconsistencias
- BAJO: Code smells, mejoras de mantenibilidad

### PREGUNTAS/SUPUESTOS
Lista de dudas o supuestos que asumiste durante la revision.

### PRUEBAS SUGERIDAS
Si aplica, lista de tests manuales o automatizados recomendados.

## Notas
- Lee solo archivos relevantes, no todo el proyecto
- Prioriza archivos modificados recientemente (git log)
- Compara frontend vs backend para inconsistencias
- Verifica que promesas de UI se cumplan en backend
