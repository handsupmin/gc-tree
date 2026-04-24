# Uso

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## Resumen

Un flujo de trabajo estándar con `gctree` tiene este aspecto: inicializar gc-tree, elegir un proveedor, hacer onboarding de la gc-branch `main` predeterminada, hacer resolve del contexto que necesitas, crear nuevas gc-branches cuando el trabajo merece su propio carril, mapear los repositorios a las gc-branches correctas y usar actualizaciones guiadas para cambios duraderos más adelante.

## Flujo de trabajo estándar

1. ejecutar `gctree init`
2. elegir el modo de proveedor preferido (`claude-code`, `codex` o `both`)
3. elegir el idioma de trabajo (`English`, `Korean` o un idioma personalizado)
4. si elegiste `both`, elegir qué proveedor debe iniciar el onboarding ahora
5. completar el onboarding guiado para la gc-branch `main` predeterminada
6. hacer resolve del contexto relevante con `gctree resolve --query "..."`
7. inspeccionar documentos de apoyo con `gctree related --id <match-id>`
8. leer el documento completo solo cuando haga falta con `gctree show-doc --id <match-id>`
9. crear o cambiar de gc-branch con `gctree checkout`
10. ejecutar `gctree onboard` solo para una gc-branch vacía
11. usar el mapeo de alcance del repositorio para que una gc-branch solo aplique donde corresponde
12. usar `gctree update-global-context` para cambios duraderos más adelante

## Comandos principales

| Comando | Propósito |
| --- | --- |
| `gctree init` | Crear `~/.gctree`, crear la gc-branch `main` predeterminada, guardar el modo de proveedor, el proveedor de onboarding y el idioma preferido, instalar hooks/comandos/skills globales del proveedor y comenzar el onboarding guiado cuando `main` está vacía. |
| `gctree checkout <branch>` | Cambiar la gc-branch activa. |
| `gctree checkout -b <branch>` | Crear y cambiar a una nueva gc-branch vacía. |
| `gctree branches` | Listar las gc-branches disponibles y mostrar la activa. |
| `gctree status` | Mostrar la gc-branch activa, el repositorio actual, el estado del alcance del repositorio actual, advertencias y el proveedor preferido. |
| `gctree resolve --query TEXT` | Devuelve la capa de índice compacto para una consulta. Las coincidencias incluyen IDs estables y comandos de seguimiento para profundizar. |
| `gctree related --id <match-id>` | Devuelve documentos de apoyo relacionados con una coincidencia resuelta, sin expandir todavía el markdown completo. |
| `gctree show-doc --id <match-id>` | Devuelve el documento source-of-truth en markdown completo para un ID estable. |
| `gctree repo-map` | Mostrar el contenido actual de `branch-repo-map.json`. |
| `gctree set-repo-scope --branch <name> --include` | Marcar el repositorio actual como incluido para esa gc-branch. |
| `gctree set-repo-scope --branch <name> --exclude` | Marcar el repositorio actual como ignorado para esa gc-branch. |
| `gctree onboard` | Iniciar el onboarding guiado para la gc-branch activa. Solo funciona cuando esa gc-branch está vacía. |
| `gctree reset-gc-branch --branch <name> --yes` | Limpiar una gc-branch para poder hacer onboarding de nuevo. |
| `gctree update-global-context` | Iniciar una actualización duradera guiada para la gc-branch activa. |
| `gctree update-gc` / `gctree ugc` | Alias para `gctree update-global-context`. |
| `gctree scaffold --host <codex\|claude-code>` | Instalar un override local orientado al proveedor en un repositorio o workspace concreto. |
| `gctree uninstall --yes` | Eliminar `~/.gctree` y la activación global de gctree. |

## Qué devuelve resolve

`gctree resolve` es ahora la **capa de índice compacto** dentro de un flujo de progressive disclosure. Puntúa cada documento de la gc-branch activa contra tu consulta y devuelve solo coincidencias con IDs estables. Las coincidencias en el título cuentan el doble que las coincidencias en el cuerpo.

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "query": "auth token rotation policy",
  "status": "matched",
  "matches": [
    {
      "id": "auth",
      "title": "Auth & Session Conventions",
      "path": "docs/auth.md",
      "score": 4,
      "summary": "JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL",
      "excerpt": "## Auth Flow\nAccess token: 15-min TTL, rotated on every authenticated request...",
      "commands": {
        "show_doc": "gctree show-doc --id \"auth\" --home \"~/.gctree\" --branch \"main\"",
        "related": "gctree related --id \"auth\" --home \"~/.gctree\" --branch \"main\""
      }
    }
  ]
}
```

El flujo recomendado es:

1. `resolve` → índice compacto
2. `related` → documentos de apoyo alrededor de una coincidencia
3. `show-doc` → markdown completo solo cuando hace falta

La degradación elegante también es explícita:

- gc-branch vacía → `status: "empty_branch"`
- repo excluido → `status: "excluded"`
- sin resultados → `status: "no_match"`
- ID de documento inexistente → `status: "doc_not_found"`

## Ejemplo de flujo de alcance del repositorio

Supongamos que la gc-branch `A` es relevante para los repositorios `B`, `C` y `D`, pero no para `F`.

Puedes gestionarlo mediante:

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

almacenado en:

```text
~/.gctree/branch-repo-map.json
```

Cuando `resolve` se ejecuta desde el repositorio `E` y la branch `A` todavía no está mapeada allí, `gctree` puede preguntar si:

1. continuar una vez
2. usar siempre `A` en `E`
3. ignorar `A` en `E`

## Ejemplo de flujo en la primera ejecución

```bash
gctree init
```

Luego:

1. elegir `codex` o `claude-code`
2. dejar que `gctree` instale la activación global para ese proveedor
3. completar el onboarding guiado para la gc-branch `main`

## Ejemplo de flujo con múltiples branches

```bash
gctree checkout -b client-b
gctree onboard
gctree resolve --query "billing retry policy"
```

## Ejemplo de flujo de actualización

```bash
gctree update-global-context
```

Alias cortos:

```bash
gctree update-gc
gctree ugc
```

Si un repositorio recién relevante también debería pasar a formar parte del contexto duradero, el flujo natural es:

1. mapear ese repositorio a la gc-branch
2. luego ejecutar `update-global-context` para agregar conocimiento duradero sobre qué hace ese repositorio y por qué es importante

## Patrones de integración

### Codex CLI / Claude Code CLI

`gctree init` instala la superficie global de hooks orientada al proveedor. `gctree scaffold` instala un override local en un directorio de destino cuando un repositorio concreto necesita sus propios snippets markdown o una superficie de comandos local.

El hook UserPromptSubmit solo inyecta contexto previo compacto: estado found/no-match, IDs de documentos coincidentes y resúmenes. No incluye excerpts largos por defecto; abre documentos completos con `gctree resolve --id <id>` cuando el resumen no sea suficiente.

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
gctree scaffold --host both --target /path/to/repo
```

**Archivos globales de Codex (`gctree init`):**

```
~/.codex/hooks.json                              ← hooks de auto-resolve para SessionStart/UserPromptSubmit
~/.codex/prompts/gctree-bootstrap.md            ← contexto de arranque para sesiones de Codex
~/.codex/skills/gc-resolve-context/SKILL.md     ← skill de resolve
~/.codex/skills/gc-onboard/SKILL.md             ← skill de onboarding
~/.codex/skills/gc-update-global-context/SKILL.md  ← skill de actualización
```

**Archivos de override local para `gctree scaffold --host codex`:**

```
AGENTS.md                                  ← fragmento de gctree añadido a las instrucciones del agente
.codex/hooks.json                         ← hooks de auto-resolve para SessionStart/UserPromptSubmit
.codex/prompts/gctree-bootstrap.md         ← contexto de arranque para las sesiones de Codex
.codex/skills/gc-resolve-context/SKILL.md  ← skill de resolve
.codex/skills/gc-onboard/SKILL.md          ← skill de onboarding
.codex/skills/gc-update-global-context/SKILL.md  ← skill de actualización
```

**Archivos globales de Claude Code (`gctree init`):**

```
~/.claude/hooks/hooks.json                         ← hooks de auto-resolve para SessionStart/UserPromptSubmit
~/.claude/hooks/gctree-session-start.md            ← nota fallback de inicio de sesión
~/.claude/commands/gc-resolve-context.md           ← comando slash de resolve
~/.claude/commands/gc-onboard.md                   ← comando slash de onboard
~/.claude/commands/gc-update-global-context.md     ← comando slash de actualización
```

**Archivos de override local para `gctree scaffold --host claude-code`:**

```
CLAUDE.md                                        ← fragmento de gctree añadido
.claude/hooks/hooks.json                         ← hooks de auto-resolve para SessionStart/UserPromptSubmit
.claude/hooks/gctree-session-start.md            ← nota fallback de inicio de sesión
.claude/commands/gc-resolve-context.md           ← comando slash de resolve
.claude/commands/gc-onboard.md                   ← comando slash de onboard
.claude/commands/gc-update-global-context.md     ← comando slash de actualización
```

Los archivos locales existentes no se modifican a menos que pases `--force`.

### Comportamiento en tiempo de ejecución

La gc-branch activa es la apuntada por `HEAD` dentro de `~/.gctree`, pero el mapeo del repositorio puede anular ese valor predeterminado cuando un repositorio está vinculado explícitamente a otra gc-branch.
Esto hace que gc-tree sea práctico para usuarios avanzados que mantienen muchas sesiones no relacionadas abiertas al mismo tiempo.
