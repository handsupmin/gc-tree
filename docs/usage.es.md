# Uso

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## Summary

Un flujo estándar de `gctree` consiste en inicializar gc-tree, elegir un provider, completar el onboarding del gc-branch `main`, crear nuevos gc-branches cuando haga falta, asociar cada repositorio al gc-branch correcto y usar actualizaciones guiadas para los cambios duraderos.

## Flujo estándar

1. ejecuta `gctree init`
2. elige tu provider preferido (`codex` o `claude-code`)
3. completa el onboarding guiado del gc-branch `main`
4. resuelve el contexto relevante con `gctree resolve --query "..."`
5. crea o cambia gc-branches con `gctree checkout`
6. usa `gctree onboard` solo en gc-branches vacíos
7. usa el mapeo por repositorio para que cada gc-branch solo aplique donde corresponde
8. usa `gctree update-global-context` para cambios duraderos posteriores

## Comandos clave

| Comando | Propósito |
| --- | --- |
| `gctree init` | Crea `~/.gctree`, crea el gc-branch `main`, guarda el provider preferido, prepara el entorno actual y arranca el onboarding guiado si `main` está vacío. |
| `gctree checkout <branch>` | Cambia el gc-branch activo. |
| `gctree checkout -b <branch>` | Crea un gc-branch vacío nuevo y cambia a él. |
| `gctree branches` | Lista los gc-branches disponibles y muestra el activo. |
| `gctree status` | Muestra el gc-branch activo, el repo actual, el estado de alcance para ese repo, las advertencias y el provider guardado. |
| `gctree resolve --query TEXT` | Busca contexto en el gc-branch relevante. Si el repo actual aún no está mapeado, permite decidir interactivamente qué hacer. |
| `gctree repo-map` | Muestra el contenido actual de `branch-repo-map.json`. |
| `gctree set-repo-scope --branch <name> --include` | Añade el repo actual al include de ese gc-branch. |
| `gctree set-repo-scope --branch <name> --exclude` | Añade el repo actual al exclude de ese gc-branch. |
| `gctree onboard` | Inicia el onboarding guiado del gc-branch activo. Solo funciona si ese gc-branch está vacío. |
| `gctree reset-gc-branch --branch <name> --yes` | Limpia un gc-branch para poder volver a hacer onboarding. |
| `gctree update-global-context` | Inicia una actualización duradera guiada para el gc-branch activo. |
| `gctree update-gc` / `gctree ugc` | Alias de `gctree update-global-context`. |
| `gctree scaffold --host <codex|claude-code>` | Instala la superficie de comandos del provider en otro entorno. |

## Ejemplo de alcance por repositorio

Por ejemplo, si el gc-branch `A` solo aplica a `B`, `C` y `D`, y no a `F`, puedes gestionarlo así:

```json
{
  "A": {
    "include": ["B", "C", "D"],
    "exclude": ["F"]
  }
}
```

Guardado en:

```text
~/.gctree/branch-repo-map.json
```

Si luego llamas a `resolve` desde `E`, puedes elegir entre:

1. continuar solo esta vez
2. usar siempre `A` en `E`
3. ignorar `A` en `E`

## Ejemplo de primera ejecución

```bash
gctree init
```

Después:

1. elige `codex` o `claude-code`
2. deja que `gctree` prepare el entorno actual
3. completa el onboarding del gc-branch `main`

## Ejemplo con varios gc-branches

```bash
gctree checkout -b client-b
gctree onboard
gctree resolve --query "billing retry policy"
```

## Ejemplo de actualización

```bash
gctree update-global-context
```

Alias cortos:

```bash
gctree update-gc
gctree ugc
```

Si al trabajar descubres que un repo realmente pertenece al gc-branch actual, el flujo natural es:

1. primero añadir ese repo al branch repo map
2. después ejecutar `update-global-context` para agregar contexto duradero sobre qué hace ese repo y por qué importa

## Patrones de integración

### Codex CLI / Claude Code CLI

`gctree scaffold` instala comandos del provider para onboarding y actualizaciones guiadas.
Esos comandos deben dejar claro cuál es el gc-branch activo antes de empezar.

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### Comportamiento en runtime

El gc-branch activo es el fallback apuntado por `HEAD` dentro de `~/.gctree`.
Pero si un repo está vinculado explícitamente a otro gc-branch, para ese repo el branch map tiene prioridad sobre HEAD.
