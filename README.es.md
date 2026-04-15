# gc-tree

Una capa de contexto global con ramas para herramientas de programación con IA.

[English](README.md) | [한국어](README.ko.md) | [简体中文](README.zh.md) | [日本語](README.ja.md) | [Español](README.es.md)

## Introducción

`gctree` es un **Global Context Tree** ligero para herramientas de programación con IA.
Le da al contexto duradero un hogar reutilizable, basado en archivos y separado por ramas, sin obligarte a adoptar una plataforma completa de orquestación.

Cuando un solo `AGENTS.md`, `CLAUDE.md` o fragmento de prompt ya no alcanza, `gctree` te ayuda a:

- separar el contexto por producto, cliente o línea de trabajo
- conservar el conocimiento fuente en markdown en lugar de depender de memoria oculta
- resolver el contexto activo rápidamente con un índice liviano y documentos summary-first
- hacer onboarding y actualizaciones duraderas desde tu CLI LLM preferida
- hacer que un gc-branch solo se use en los repos realmente relacionados

## Características rápidas

- **Onboarding guiado por provider**  
  `gctree init` primero te pregunta qué modo de provider quieres usar (`claude-code`, `codex` o `both`), luego qué idioma deben usar las respuestas, guarda esas decisiones, prepara la superficie de comandos adecuada y arranca el onboarding del gc-branch `main` por defecto.
- **gc-branches con alcance por repositorio**  
  Con `~/.gctree/branch-repo-map.json` puedes asociar un gc-branch solo a ciertos repositorios. Por ejemplo, hacer que A aplique a B/C/D y se ignore en F.
- **Protección interactiva de alcance**  
  Si `gctree resolve` detecta que el repositorio actual todavía no está asociado a ese gc-branch, puede preguntarte si quieres continuar una vez, usarlo siempre aquí o ignorarlo aquí.
- **Documentación summary-first**  
  Las herramientas pueden leer primero un resumen corto y abrir el documento completo solo cuando hace falta.
- **Actualizaciones duraderas guiadas**  
  Puedes actualizar el contexto global con el mismo flujo del provider, sin escribir JSON a mano.

## Instalación y guía rápida

### Instalar desde el código fuente

```bash
git clone https://github.com/handsupmin/gc-tree.git
cd gc-tree
npm install
npm run build
npm link
```

**Requisito:** Node.js 20+

### Inicio rápido

#### 1) Inicializa gc-tree

```bash
gctree init
```

Este comando:

- crea `~/.gctree`
- crea el gc-branch `main` por defecto
- te pide elegir un modo de provider (`claude-code`, `codex` o `both`)
- si eliges `both`, te pregunta qué provider debe iniciar este onboarding
- te pide elegir el idioma (`English`, `Korean` o escribir tu propio idioma)
- guarda el modo de provider, el provider real de onboarding y el idioma en `~/.gctree/settings.json`
- prepara la superficie de comandos adecuada en el entorno actual
- inicia el onboarding guiado del gc-branch activo cuando `main` sigue vacío

#### 2) Resuelve el contexto activo

```bash
gctree resolve --query "auth token rotation"
```

Si el repositorio actual aún no está asociado a ese gc-branch, `gctree` puede dejarte elegir entre:

1. continuar solo esta vez
2. usar siempre este gc-branch en este repo
3. ignorar este gc-branch en este repo

Si eliges 2 o 3, `~/.gctree/branch-repo-map.json` se actualiza.

#### 3) Crea otro gc-branch si necesitas un contexto separado

```bash
gctree checkout -b client-b
```

`checkout -b` crea un **gc-branch vacío nuevo**. No copia los documentos de otra rama.

#### 4) Haz onboarding de un gc-branch vacío

```bash
gctree onboard
```

#### 5) Actualiza el contexto duradero más adelante

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
2. después ejecutar `gctree update-global-context` para agregar contexto duradero sobre qué hace ese repo y por qué importa

#### 6) Restablece un gc-branch antes de volver a hacer onboarding

```bash
gctree reset-gc-branch --branch client-b --yes
```

### Comandos visibles dentro del runtime

Después del scaffold, los comandos visibles son:

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

Esos comandos deben dejar claro cuál es el gc-branch activo antes de empezar a recoger o actualizar contexto duradero, y también deben mantener el idioma guardado hasta el final, salvo que el usuario pida cambiarlo explícitamente.

### Comandos clave de un vistazo

| Objetivo | Comando |
| --- | --- |
| Inicializar gc-tree y elegir provider | `gctree init` |
| Confirmar el gc-branch activo | `gctree status` |
| Buscar en el contexto activo | `gctree resolve --query "..."` |
| Ver las reglas de alcance por repo | `gctree repo-map` |
| Incluir o excluir un repo para un gc-branch | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| Crear o cambiar gc-branches | `gctree checkout <branch>` / `gctree checkout -b <branch>` |
| Hacer onboarding de un gc-branch vacío | `gctree onboard` |
| Actualizar el gc-branch activo | `gctree update-global-context` / `gctree update-gc` / `gctree ugc` |
| Restablecer un gc-branch antes de re-onboard | `gctree reset-gc-branch --branch <name> --yes` |
| Instalar scaffold manualmente en otro entorno | `gctree scaffold --host codex --target /path/to/repo` |

## Documentación

La documentación detallada está en el directorio [`docs/`](docs).

- **Concepto** — [`docs/concept.es.md`](docs/concept.es.md)  
  Explica qué es `gctree`, qué problema resuelve y cuál es el alcance de la capa de contexto global.
- **Principios** — [`docs/principles.es.md`](docs/principles.es.md)  
  Resume las reglas de gc-branches, alcance por repositorio, documentos summary-first y actualizaciones guiadas.
- **Uso** — [`docs/usage.es.md`](docs/usage.es.md)  
  Describe el flujo CLI estándar, los comandos del provider, el comportamiento de alcance por repo y los patrones de integración.
- **Desarrollo local** — [`docs/local-development.es.md`](docs/local-development.es.md)  
  Explica cómo instalar dependencias, ejecutar la CLI localmente y verificar cambios.

## Contribuir

Las contribuciones son bienvenidas. Consulta el documento en inglés [CONTRIBUTING.md](CONTRIBUTING.md) para ver el flujo de desarrollo y la checklist de PR.

## Licencia

MIT. Consulta [`LICENSE`](LICENSE).
