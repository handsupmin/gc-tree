# gc-tree

<div align="center">

```text
              __                          
             /\ \__                       
   __     ___\ \ ,_\  _ __    __     __   
 /'_ `\  /'___\ \ \/ /\`'__\/'__`\ /'__`\ 
/\ \L\ \/\ \__/\ \ \_\ \ \//\  __//\  __/ 
\ \____ \ \____\\ \__\\ \_\\ \____\ \____\
 \/___L\ \/____/ \/__/ \/_/ \/____/\/____/
   /\____/                                
   \_/__/                                 
```

<img src="./logo.png" alt="logo de gc-tree" width="260" />

### Contexto global más allá de CLAUDE.md y AGENTS.md.

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

La IA no te conoce.

No sabe en qué trabajas, cómo trabajas, qué significan los términos de tu equipo ni cuáles son las rutinas que repites sin pensarlo. Si no explicas con precisión lo que quieres, rara vez obtienes el resultado que esperabas.

Así que acabas haciendo esto cada vez:

- Volver a presentarte y explicar cómo trabajas
- Volver a explicar el lenguaje de dominio de tu equipo
- Volver a explicar qué repositorios van juntos
- Pegar el mismo documento de arquitectura en el prompt otra vez
- Recordarle al agente las convenciones que ya "sabía" la semana pasada
- Eliminar manualmente el contexto irrelevante para el repositorio actual

No es porque la IA sea tonta. Es porque este tipo de contexto es difícil de mantener vivo dentro de un solo workspace, sobre todo cuando el trabajo real se mueve entre varios repositorios y proyectos.

`CLAUDE.md` y `AGENTS.md` funcionan muy bien para describir un repositorio. Pero cuando el trabajo cruza límites entre repos, las relaciones entre repos son difíciles de expresar, el conocimiento compartido se duplica y cada sesión nueva empieza con demasiado poco contexto.

`gc-tree` existe para eliminar esa repetición.

---

## Para quién es esto

Sacarás más partido a `gc-tree` si:

- Trabajas en **múltiples repositorios** (equipos con monorepo, repos de plataforma, stacks de backend + frontend)
- Cambias entre **múltiples productos, proyectos o workstreams**
- Te encuentras **explicando el mismo contexto** al inicio de cada sesión de IA
- Quieres que tus herramientas de IA entiendan tu **forma de trabajar, terminología del equipo, arquitectura y conocimiento de dominio** — no solo el archivo actual

Si solo trabajas en un repositorio y un producto, no necesitas esto. `CLAUDE.md` o `AGENTS.md` es suficiente.

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

Después, tu herramienta de IA instala integración real de hooks SessionStart/UserPromptSubmit: revisa gc-tree automáticamente antes de trabajar y cachea resultados vacíos/no-match durante la sesión. La salida del hook inyecta los resúmenes de los documentos coincidentes directamente en el contexto — de modo que la IA ve patrones y comandos reales, no solo títulos. Los documentos completos siempre están disponibles bajo demanda mediante `gctree resolve --id <id>`.

- **CLI:** `gctree`
- **Requisito:** Node.js 20+

---

## Qué hace gc-tree

`gc-tree` opera **por encima del nivel del repositorio**. Guarda tu forma de trabajar, la terminología del equipo, las relaciones entre repositorios y el conocimiento compartido como contexto global duradero. Tus herramientas de IA traen solo lo relevante antes de cada sesión, de forma automática.

`gctree resolve` es la **capa de índice compacto** dentro de un flujo de progressive disclosure:

- `gctree resolve --query "..."` → lista compacta de coincidencias con IDs estables
- `gctree related --id <match-id>` → documentos de apoyo alrededor de una coincidencia
- `gctree show-doc --id <match-id>` → markdown completo de ese documento

Además, cuando la branch está vacía, el repositorio está excluido o la consulta no tiene resultados, gc-tree devuelve un estado explícito en lugar de fallar de forma ambigua.

```bash
gctree resolve --query "auth token rotation policy"
```

```
[gc-tree] 1 matching doc  gc-branch="main"  repo="my-repo"
[Auth & Session Conventions] JWT rotation on every request, refresh tokens in httpOnly cookies, 15-min access token TTL
[Auth & Session Conventions] show full doc: gctree show-doc --id "auth" --branch "main"
```

Tu herramienta de IA recibe el contexto correcto — no toda la base de conocimiento, solo el fragmento relevante.

**En la práctica: solo ~4% del contexto total se inyecta por consulta.** El 96% restante permanece en disco, fuera de la ventana de tokens, hasta que de verdad haga falta.

---

## ¿En qué se diferencia de CLAUDE.md o AGENTS.md?

`CLAUDE.md` y `AGENTS.md` son geniales — para un solo repositorio.

En el momento en que tienes múltiples repos, proyectos o workstreams:

|                            | `CLAUDE.md` / `AGENTS.md` | `gc-tree`                                     |
| -------------------------- | -------------------------- | --------------------------------------------- |
| Alcance                    | Un repositorio             | Múltiples repos, un contexto                  |
| Persistencia               | Archivo dentro del repo    | Almacenado fuera, reutilizable entre sesiones |
| Cambio de contexto         | Edición manual de archivos | `gctree checkout project-b`                   |
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
gctree init                         # configura ~/.gctree y la activación global para el provider elegido
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
[gc-tree] 1 matching doc  gc-branch="main"  repo="my-repo"
[Backend Coding Conventions] DTO: class-transformer plainToInstance, class-validator required. Error handling: HttpException-based custom exceptions, no raw Error throws.
[Backend Coding Conventions] show full doc: gctree show-doc --id "backend-conventions" --branch "main"
```

---

## Movimientos habituales

### Contextos separados para workstreams distintos

```bash
gctree checkout -b project-b
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
gctree set-repo-scope --branch project-b --include   # incluir el repo actual
gctree set-repo-scope --branch project-b --exclude   # excluir el repo actual
```

`gc-tree` no inyectará un contexto en repos donde no corresponde.

---

## Cómo se almacena el contexto

```
~/.gctree/
  branches/
    main/
      index.md          ← índice compacto, se carga primero
      docs/
        auth.md         ← doc completo, se lee solo cuando hace falta
        architecture.md
    project-b/
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
| Instalar un override local en un repo              | `gctree scaffold --host codex --target /path/to/repo`           |
| Actualizar gctree y reinstalar todos los providers | `gctree update`                                                 |
| Quitar la activación global y el contexto          | `gctree uninstall --yes`                                        |

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
