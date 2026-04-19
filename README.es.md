# gc-tree

<div align="center">

<img src="./logo.png" alt="logo de gc-tree" width="260" />

### Contexto global, más allá del proyecto.

Añade a tus herramientas de IA una capa de contexto reutilizable y duradera.
Gestiona varios contextos con la misma naturalidad con la que manejas ramas de Git.

[![npm version](https://img.shields.io/npm/v/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![npm downloads](https://img.shields.io/npm/dm/%40handsupmin%2Fgc-tree)](https://www.npmjs.com/package/@handsupmin/gc-tree)
[![GitHub stars](https://img.shields.io/github/stars/handsupmin/gc-tree)](https://github.com/handsupmin/gc-tree/stargazers)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/handsupmin/gc-tree/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

[English](https://github.com/handsupmin/gc-tree/blob/main/README.md) | [한국어](https://github.com/handsupmin/gc-tree/blob/main/README.ko.md) | [简体中文](https://github.com/handsupmin/gc-tree/blob/main/README.zh.md) | [日本語](https://github.com/handsupmin/gc-tree/blob/main/README.ja.md) | [Español](https://github.com/handsupmin/gc-tree/blob/main/README.es.md)

</div>

---

## El problema

Usas Claude Code o Codex a diario. Pero tu trabajo real se extiende por múltiples repositorios, productos y clientes — y tus herramientas de IA solo conocen el archivo actual.

Así que acabas haciendo esto cada vez:

- Volver a explicar qué repositorios van juntos
- Pegar el mismo documento de arquitectura en el prompt otra vez
- Recordarle al agente las convenciones que ya "sabía" la semana pasada
- Eliminar manualmente el contexto irrelevante para el repositorio actual

Esto no es un problema de IA. Es un **problema de gestión del contexto**.

---

## Para quién es esto

Sacarás más partido a `gc-tree` si:

- Trabajas en **múltiples repositorios** (equipos con monorepo, repos de plataforma + cliente, stacks de backend + frontend)
- Cambias entre **múltiples productos o clientes** en la misma semana
- Te encuentras **explicando el mismo contexto** al inicio de cada sesión de IA
- Quieres que tus herramientas de IA entiendan tus **convenciones, arquitectura y conocimiento de dominio** — no solo el archivo actual

Si solo trabajas en un repositorio y un producto, no necesitas esto. `CLAUDE.md` o `.cursorrules` es suficiente.

---

## Instalación y arranque rápido

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

`gctree init` te guía a través de:

1. Elegir provider: `claude-code`, `codex` o `both`
2. Instalar los archivos de integración en el repositorio actual
3. Completar el onboarding guiado para el gc-branch `main`

Después, tu herramienta de IA aprenderá a llamar a `gctree resolve` antes de planificar o implementar.

- **CLI:** `gctree`
- **Requisito:** Node.js 20+

---

## Qué hace gc-tree

`gc-tree` opera **por encima del nivel del repositorio**. Almacena contexto en archivos Markdown estructurados y permite que tus herramientas de IA traigan solo lo relevante antes de cada sesión, de forma automática.

```bash
gctree resolve --query "auth token rotation policy"
```

```json
{
  "gc_branch": "main",
  "matches": [
    {
      "title": "Convenciones de Auth y Sesión",
      "score": 4,
      "summary": "Rotation de JWT en cada petición, refresh tokens en cookies httpOnly, TTL de 15 min para access tokens",
      "excerpt": "## Flujo de Auth\nAccess token: TTL 15 min, rotation en cada petición autenticada..."
    }
  ]
}
```

Tu herramienta de IA recibe el contexto correcto — no toda la base de conocimiento, solo el fragmento relevante.

**En la práctica: solo ~4% del contexto total se inyecta por consulta.** El 96% restante permanece en disco, fuera de la ventana de tokens, hasta que de verdad haga falta.

---

## ¿En qué se diferencia de CLAUDE.md o cursor rules?

`CLAUDE.md` es genial — para un solo repositorio.

En el momento en que tienes múltiples repos, clientes o workstreams:

|                            | `CLAUDE.md` / cursor rules | `gc-tree`                                     |
| -------------------------- | -------------------------- | --------------------------------------------- |
| Alcance                    | Un repositorio             | Múltiples repos, un contexto                  |
| Persistencia               | Archivo dentro del repo    | Almacenado fuera, reutilizable entre sesiones |
| Cambio de contexto         | Edición manual de archivos | `gctree checkout client-b`                    |
| Filtrado por relevancia    | Todo o nada                | Solo inyecta docs coincidentes (~4%)          |
| Onboarding                 | Escrito a mano             | Guiado por tu herramienta de IA               |
| Compatible con Codex       | ✅                         | ✅                                            |
| Compatible con Claude Code | ✅                         | ✅                                            |

---

## Rendimiento validado

Probado con documentación interna real (4 exportaciones de Notion, consultas mixtas en español e inglés):

| Métrica                                                      | Resultado        |
| ------------------------------------------------------------ | ---------------- |
| Recall — consultas relevantes que encuentran el doc correcto | **100%** (16/16) |
| Precision — consultas irrelevantes que devuelven vacío       | **80%** (4/5)    |
| F1 score                                                     | **88.9%**        |
| Tokens inyectados por consulta vs. contexto total            | **~4%**          |
| Compatible con consultas mixtas en varios idiomas            | ✅               |

---

## Funciona con Claude Code y Codex — ambos verificados

```bash
gctree scaffold --host claude-code   # instala snippet en CLAUDE.md + /gc-onboard, /gc-update-global-context
gctree scaffold --host codex         # instala snippet en AGENTS.md + $gc-onboard, $gc-update-global-context
gctree scaffold --host both          # ambos a la vez
```

Los dos providers usan el mismo almacén de contexto. Haz el onboarding una vez y úsalo desde cualquiera de los dos.

**Claude Code** — usa los slash commands `/gc-resolve-context`, `/gc-onboard`, `/gc-update-global-context`.

**Codex** — usa los skills `$gc-resolve-context`, `$gc-onboard`, `$gc-update-global-context`. Verificado con `codex exec`:

```
gctree status → gc_branch: main, doc_count: 2
gctree resolve --query 'NestJS DTO plainToInstance'
→ coincidencia con "Convenciones de Backend" (score: 3)
→ DTO: class-transformer plainToInstance, class-validator obligatorio
→ Manejo de errores: excepciones personalizadas basadas en HttpException, prohibido lanzar raw Error
```

---

## Movimientos habituales

### Contextos separados para workstreams distintos

```bash
gctree checkout -b client-b
gctree onboard
```

Cada gc-branch es un carril de contexto completamente independiente. Cambia entre ellos como con ramas de Git.

### Traer contexto relevante cuando lo necesitas

```bash
gctree resolve --query "billing retry policy"
```

Solo devuelve los docs que coinciden — título, resumen y fragmento. El tool lee el doc completo únicamente si el resumen no es suficiente.

### Mantener el contexto al día

```bash
gctree update-global-context   # o: gctree update-gc / gctree ugc
```

Flujo de actualización guiado — tu herramienta de IA pregunta qué ha cambiado y escribe el nuevo contexto de vuelta al gc-branch.

### Acotar el contexto a repos específicos

```bash
gctree set-repo-scope --branch client-b --include   # incluir el repo actual
gctree set-repo-scope --branch client-b --exclude   # excluir el repo actual
```

`gc-tree` no inyectará un contexto en repos donde no corresponde.

---

## Cómo se almacena el contexto

```
~/.gctree/
  branches/
    main/
      index.md          ← índice compacto, ≤2000 chars, se carga primero
      docs/
        auth.md         ← doc completo, se lee solo cuando hace falta
        architecture.md
    client-b/
      index.md
      docs/
        ...
  branch-repo-map.json  ← qué repos pertenecen a qué gc-branch
  settings.json         ← provider preferido, idioma
```

El contexto vive fuera de tus repositorios — sin reglas de `.gitignore`, sin commits accidentales, reutilizable en todos los proyectos que usen el mismo gc-branch.

---

## Comandos principales

| Objetivo                                           | Comando                                                         |
| -------------------------------------------------- | --------------------------------------------------------------- |
| Inicializar gc-tree y elegir provider              | `gctree init`                                                   |
| Confirmar el gc-branch activo                      | `gctree status`                                                 |
| Buscar en el contexto activo                       | `gctree resolve --query "..."`                                  |
| Crear o cambiar gc-branches                        | `gctree checkout <branch>` / `gctree checkout -b <branch>`      |
| Listar todos los gc-branches                       | `gctree branches`                                               |
| Onboarding guiado de un gc-branch vacío            | `gctree onboard`                                                |
| Actualización guiada del gc-branch activo          | `gctree update-global-context` / `gctree ugc`                   |
| Ver reglas de alcance por repo                     | `gctree repo-map`                                               |
| Incluir o excluir el repo actual para un gc-branch | `gctree set-repo-scope --branch <name> --include` / `--exclude` |
| Resetear un gc-branch antes de re-onboard          | `gctree reset-gc-branch --branch <name> --yes`                  |
| Instalar scaffold en un nuevo entorno              | `gctree scaffold --host codex --target /path/to/repo`           |

---

## Documentación

- **Concepto** — [`docs/concept.es.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.es.md)
- **Principios** — [`docs/principles.es.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.es.md)
- **Uso** — [`docs/usage.es.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.es.md)
- **Desarrollo local** — [`docs/local-development.es.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.es.md)

---

## Contribuir

Las contribuciones son bienvenidas. Consulta [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md) para el flujo de desarrollo y la checklist de PR.

---

## Licencia

MIT. Consulta [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE).
