# Desarrollo local

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## Resumen

El desarrollo local sigue un flujo estándar de Node.js 20+: instalar dependencias, compilar la CLI, ejecutarla localmente y verificar los cambios con la suite de tests existente antes de enviarlos.

## Requisitos previos

- Node.js 20+
- npm
- binarios locales de `codex` y / o `claude` si quieres probar manualmente el arranque de providers

## Preparación

```bash
npm install
npm run build
```

## Ejecuta la CLI en local

### Opción 1: ejecutar directamente la entrada ya compilada

```bash
node dist/src/cli.js status
```

### Opción 2: enlazar la CLI en tu shell

```bash
npm link
gctree status
```

Si cambias archivos TypeScript, vuelve a compilar antes de probar otra vez la CLI.

## Verificación

Ejecuta esto antes de abrir un pull request:

```bash
npm run build
npm test
```

## Tests de repo scope

La suite de tests cubre ahora:

- persistencia del modo de provider (`claude-code`, `codex`, `both`)
- persistencia del idioma preferido y aplicación estricta del idioma en los launch prompts
- selección de gc-branch con conciencia de repositorio
- decisiones interactivas de include / exclude durante `resolve`
- actualizaciones del branch repo map
- límites del flujo guiado de onboarding / update

## Comprobaciones manuales E2E de providers

Los tests automatizados desactivan el lanzamiento de providers para poder verificar los launch plans sin abrir sesiones reales de Codex o Claude Code.
Si quieres probar la ruta real de lanzamiento, ejecuta uno de estos comandos dentro de un directorio desechable:

```bash
gctree init --provider codex
gctree init --provider claude-code
```

Deberías ver que el provider se abre y recibe inmediatamente `$gc-onboard` o `/gc-onboard`.

## Estructura del proyecto

- `src/` — CLI, almacenamiento de contexto, selección de provider, mapeo de repo scope, flujos guiados de onboarding / update y lógica de scaffolding
- `tests/` — tests de CLI y de comportamiento
- `skills/` — habilidades de flujo de trabajo independientes de la herramienta
- `scaffolds/` — plantillas de arranque específicas por host
- `docs/` — documentación de concepto, principios, uso y desarrollo
