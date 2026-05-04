# Desarrollo local

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## Resumen

El desarrollo local sigue un flujo de trabajo estándar de Node.js 20+: instalar dependencias, compilar la CLI, ejecutarla localmente y verificar los cambios con el conjunto de pruebas existente antes de enviarlos.

## Requisitos previos

- Node.js 20+
- npm
- binarios locales de `codex` y/o `claude` si quieres hacer pruebas manuales con los lanzamientos de proveedores

## Configuración

```bash
npm install
npm run build
```

## Ejecutar la CLI localmente

### Opción 1: ejecutar el punto de entrada compilado directamente

```bash
node dist/src/cli.js status
```

### Opción 2: enlazar la CLI en tu shell

```bash
npm link
gctree status
```

Si cambias archivos TypeScript, vuelve a compilar antes de probar la CLI de nuevo.

## Verificación

Ejecuta esto antes de abrir un pull request:

```bash
npm run build
npm test
```

### Suite de evaluación

Además de las pruebas unitarias, una suite de evaluación mide la calidad de resolve contra fixtures realistas:

```bash
npm run eval                  # suite sintética de 5 escenarios (onboarding, resolve, eficiencia de tokens, actualización, aislamiento)
npm run eval:verbose          # lo mismo, con detalle por caso
npm run eval:multi-repo       # prueba de aislamiento entre repositorios usando fixtures de estilo cosmo
npm run eval:real-docs        # recall y precisión contra exportaciones reales de Notion (requiere documentos locales)
npm run eval:autoresearch     # bucle iterativo de mejora de resolve (modifica src/resolve.ts en su lugar)
```

Líneas base esperadas (ejecuta `npm run eval` para verificar):

| Suite | Objetivo |
| --- | --- |
| Sintética (5 escenarios) | 5/5 PASS, media ≥ 90% |
| Multi-repo | ≥ 80% en total |
| Real-docs | Recall ≥ 90%, F1 ≥ 80% |

Si modificas `src/resolve.ts`, ejecuta `npm test && npm run eval && npm run eval:real-docs` antes de abrir un PR.

## Cobertura de pruebas

El conjunto de pruebas unitarias cubre actualmente:

- persistencia del modo de proveedor (`claude-code`, `codex`, `both`)
- persistencia del idioma preferido y aplicación estricta del idioma en los prompts de lanzamiento
- selección de gc-branch según el repositorio
- decisiones interactivas de incluir/excluir durante `resolve`
- actualizaciones del mapa de repositorios de la branch
- límites del flujo guiado de onboarding/actualización

## Verificaciones E2E manuales del proveedor

Las pruebas automatizadas deshabilitan el lanzamiento del proveedor para poder verificar los planes de lanzamiento sin abrir sesiones reales de Codex o Claude Code.
Si quieres hacer pruebas con el camino de lanzamiento real, ejecuta uno de estos en un directorio de prueba:

```bash
gctree init --provider codex
gctree init --provider claude-code
```

Deberías ver cómo se abre el proveedor y recibe inmediatamente `$gc-onboard` o `/gc-onboard`.

## Estructura del proyecto

- `src/` — CLI, almacenamiento de contexto, selección de proveedor, mapeo de alcance del repositorio, flujos guiados de onboarding/actualización y lógica de scaffolding
- `tests/` — pruebas unitarias y scripts de evaluación
- `skills/` — skills de flujo de trabajo agnósticas a la herramienta (usadas por Claude Code)
- `scaffolds/` — directorios de marcador de posición; el contenido de los archivos de scaffold se genera programáticamente en `src/scaffold.ts`
- `docs/` — documentación de concepto, principios, uso y desarrollo
