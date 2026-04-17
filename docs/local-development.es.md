# Desarrollo local

[English](local-development.md) | [한국어](local-development.ko.md) | [简体中文](local-development.zh.md) | [日本語](local-development.ja.md) | [Español](local-development.es.md)

## Summary

El desarrollo local sigue un flujo estándar de Node.js 20+: instala dependencias, construye la CLI, ejecútala localmente y verifica con la suite de tests existente antes de enviar cambios.

## Estado del paquete

`gc-tree` ya está preparado como paquete de npm, pero la publicación pública sin scope sigue bloqueada por la política de nombres similares de npm porque se parece demasiado a `rc-tree`.
Para el desarrollo diario usa el flujo desde código fuente que aparece abajo y, antes de cualquier intento de release, ejecuta `npm publish --dry-run`.

## Requisitos previos

- Node.js 20+
- npm
- binarios locales de `codex` o `claude` si quieres validar manualmente el arranque del provider

## Configuración

```bash
npm install
npm run build
```

## Ejecutar la CLI localmente

### Opción 1: ejecutar directamente la entrada construida

```bash
node dist/src/cli.js status
```

### Opción 2: enlazar la CLI a tu shell

```bash
npm link
gctree status
```

Si cambias el código TypeScript, vuelve a construir antes de probar de nuevo la CLI.

## Verificación

Antes de enviar cambios, ejecuta:

```bash
npm run build
npm test
npm publish --dry-run
```

## Tests de alcance por repositorio

La suite actual verifica:

- persistencia del modo de provider (`claude-code`, `codex`, `both`)
- persistencia del idioma preferido y refuerzo fuerte del idioma en el launch prompt
- selección de gc-branch según el repositorio
- interacciones include/exclude durante `resolve`
- actualización del branch repo map
- límites del flujo guiado de onboarding/update

## Verificación manual E2E del provider

Los tests automáticos desactivan el provider launch para validar el launch plan sin abrir sesiones reales de Codex o Claude Code.
Si quieres comprobar el camino real de arranque, usa un directorio temporal y ejecuta:

```bash
gctree init --provider codex
gctree init --provider claude-code
```

Si todo está bien, el provider se abrirá de verdad y recibirá inmediatamente `$gc-onboard` o `/gc-onboard`.

## Estructura del proyecto

- `src/` — CLI, almacenamiento de contexto, selección de provider, mapeo de alcance por repositorio, flujos guiados de onboarding/update y lógica de scaffolding
- `tests/` — tests de CLI y comportamiento
- `skills/` — skills de flujo de trabajo agnósticos a la herramienta
- `scaffolds/` — plantillas bootstrap específicas del host
- `docs/` — documentación de concept, principles, usage y development
