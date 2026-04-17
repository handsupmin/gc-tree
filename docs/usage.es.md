# Uso

[English](usage.md) | [한국어](usage.ko.md) | [简体中文](usage.zh.md) | [日本語](usage.ja.md) | [Español](usage.es.md)

## Resumen

Un flujo estándar con `gctree` suele ser así: inicializar gc-tree, elegir un provider, hacer onboarding del gc-branch `main`, resolver el contexto activo cuando haga falta, crear nuevos gc-branches cuando el trabajo lo pida, mapear cada repo al gc-branch correcto y usar actualizaciones guiadas para los cambios duraderos.

## Flujo estándar

1. ejecuta `gctree init`
2. elige tu modo de provider preferido (`claude-code`, `codex` o `both`)
3. elige el idioma del flujo (`English`, `Korean` o un idioma personalizado)
4. si elegiste `both`, decide qué provider debe iniciar este onboarding
5. completa el onboarding guiado del gc-branch `main`
6. usa `gctree resolve --query "..."` para recuperar el contexto relevante
7. crea o cambia gc-branches con `gctree checkout`
8. usa `gctree onboard` solo en un gc-branch vacío
9. configura el repo scope para que cada gc-branch solo se aplique donde corresponde
10. usa `gctree update-global-context` para los cambios duraderos posteriores

## Comandos clave

| Comando | Propósito |
| --- | --- |
| `gctree init` | Crea `~/.gctree`, crea el gc-branch `main`, guarda el modo de provider, el provider de onboarding y el idioma preferido, hace scaffold del entorno actual y arranca el onboarding guiado cuando `main` está vacío. |
| `gctree checkout <branch>` | Cambia el gc-branch activo. |
| `gctree checkout -b <branch>` | Crea un gc-branch vacío nuevo y cambia a él. |
| `gctree branches` | Lista los gc-branches disponibles y marca cuál está activo. |
| `gctree status` | Muestra el gc-branch activo, el repo actual, el estado actual de repo scope, advertencias y el provider preferido. |
| `gctree resolve --query TEXT` | Busca contexto en el gc-branch relevante. Si el repo actual no está mapeado, `gctree` puede preguntar cómo debe tratarse ese repo. |
| `gctree repo-map` | Muestra el contenido actual de `branch-repo-map.json`. |
| `gctree set-repo-scope --branch <name> --include` | Marca el repo actual como incluido para ese gc-branch. |
| `gctree set-repo-scope --branch <name> --exclude` | Marca el repo actual como ignorado para ese gc-branch. |
| `gctree onboard` | Lanza el onboarding guiado para el gc-branch activo. Solo funciona si ese gc-branch está vacío. |
| `gctree reset-gc-branch --branch <name> --yes` | Vacía un gc-branch para poder onboardearlo de nuevo. |
| `gctree update-global-context` | Lanza una actualización duradera guiada para el gc-branch activo. |
| `gctree update-gc` / `gctree ugc` | Alias de `gctree update-global-context`. |
| `gctree scaffold --host <codex|claude-code>` | Instala la superficie de comandos del provider en otro entorno. |

## Ejemplo de repo scope

Supón que el gc-branch `A` es relevante para los repos `B`, `C` y `D`, pero no para `F`.

Puedes gestionarlo así:

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

Cuando ejecutas `resolve` desde el repo `E` y la rama `A` todavía no está mapeada allí, `gctree` puede preguntarte si quieres:

1. continuar solo esta vez
2. usar siempre `A` en `E`
3. ignorar `A` en `E`

## Ejemplo de primera ejecución

```bash
gctree init
```

Luego:

1. elige `codex` o `claude-code`
2. deja que `gctree` haga scaffold del entorno actual
3. completa el onboarding guiado del gc-branch `main`

## Ejemplo con varias ramas

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

Si un repo recién relevante también debería formar parte del contexto duradero, el flujo natural es:

1. primero mapear ese repo al gc-branch
2. después ejecutar `update-global-context` para añadir conocimiento duradero sobre qué hace ese repo y por qué importa

## Patrones de integración

### Codex CLI / Claude Code CLI

`gctree scaffold` instala la superficie de comandos orientada al provider, como el onboarding guiado y las actualizaciones guiadas.
Esos comandos deberían mencionar de forma explícita cuál es el gc-branch activo antes de empezar a recopilar o aplicar contexto duradero, y también deberían seguir usando el idioma guardado salvo que la persona usuaria pida cambiarlo.

```bash
gctree scaffold --host codex --target /path/to/repo
gctree scaffold --host claude-code --target /path/to/repo
```

### Comportamiento en runtime

Por defecto, el gc-branch activo es el que apunta `HEAD` dentro de `~/.gctree`, pero el repo mapping puede sobrescribir ese valor si un repositorio está ligado explícitamente a otro gc-branch.
Eso hace que gc-tree sea práctico incluso para quienes mantienen muchas sesiones abiertas a la vez en repositorios que no tienen relación entre sí.
