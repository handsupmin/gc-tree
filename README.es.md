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

Hecho para quienes trabajan de verdad entre varios repositorios, productos, clientes y flujos de trabajo.

`gc-tree` añade a tus herramientas de programación con IA una **capa de contexto reutilizable por encima del repo**. Conserva el contexto que dura, lo aplica solo donde corresponde y se aparta cuando el repositorio actual no tiene nada que ver.

---

## Por qué gc-tree

En cuanto empiezas a usar agentes de IA en trabajo real, el contexto local al repositorio se queda corto enseguida.

Cuando tu día a día se reparte entre varios repos y varias líneas de trabajo, suelen aparecer los mismos problemas:

- el contexto duradero acaba metido a la fuerza en los prompts
- el contexto que no toca se cuela en repositorios donde no debería
- cada sesión nueva obliga a repetir la misma explicación
- el conocimiento de cliente o producto vive escondido en el historial del chat
- cambiar de workstream significa cambiar de contexto a mano, en tu propia cabeza

`gc-tree` está pensado para gente que ya usa a fondo herramientas como Codex o Claude Code y no quiere seguir gestionando el contexto como una tarea manual más.

---

## Qué te da

- **Varios contextos duraderos**
  Puedes mantener carriles separados por producto, cliente o workstream.

- **Relevancia acotada por repositorio**
  Puedes decidir con claridad qué contexto debe aplicarse solo a qué repos.

- **Protección de alcance más inteligente**
  Si entras en un repo todavía no asociado, puedes elegir si seguir solo esta vez, usar siempre ese contexto ahí o ignorarlo en ese repo.

- **Onboarding y actualizaciones guiadas**
  Puedes crear y mantener el contexto con Codex, Claude Code o ambos.

- **Conocimiento en markdown, con enfoque summary-first**
  El contexto vive en archivos visibles, no en memoria oculta, y las herramientas pueden leer primero el resumen corto.

---

## Instalación y arranque rápido

```bash
npm install -g @handsupmin/gc-tree
gctree init
```

Con eso ya puedes arrancar.
A partir de ahí, sigue trabajando como siempre: `gc-tree` simplemente añade una capa de contexto global reutilizable alrededor de tu flujo habitual.

- **Comando CLI:** `gctree`
- **Requisito:** Node.js 20+

Si quieres trabajar desde el código fuente, consulta [docs/local-development.es.md](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.es.md).

---

## Movimientos habituales

### Crea un contexto nuevo cuando un workstream merezca su propio carril

```bash
gctree checkout -b client-b
gctree onboard
```

Si un cliente, un producto, una migración o una iniciativa concreta necesita su propio contexto duradero, dale su propio gc-branch.

### Actualiza después el contexto duradero

```bash
gctree update-global-context
```

A medida que el trabajo avanza, añade al gc-branch activo lo que merece quedarse a largo plazo.

Alias cortos:

```bash
gctree update-gc
gctree ugc
```

### Resuelve el contexto cuando de verdad lo necesites

```bash
gctree resolve --query "auth token rotation"
```

Trae de vuelta el contexto relevante justo en el momento en que hace falta.

---

## Por qué se siente natural

**Puedes manejar varios contextos como si fueran ramas de Git, pero sin tener que vivir pendiente de ellos.**

Puedes separar contextos para:

- un cliente
- una línea de producto
- un equipo de plataforma
- un stack compartido de backend + frontend
- una iniciativa temporal o una migración

Y moverte entre ellos con comandos familiares:

```bash
gctree checkout -b client-b
gctree checkout main
```

Pero, a diferencia de Git, no tienes que vigilar ese cambio manualmente todo el tiempo.

Si el repo en el que estás queda fuera del alcance del contexto activo, `gc-tree` puede tratar ese contexto como irrelevante en lugar de dejar que se cuele en la sesión equivocada.

Eso te permite mantener varios contextos a largo plazo sin arrastrarlos todos a cada sesión de trabajo.

---

## Un flujo de trabajo realista

Imagina que trabajas entre:

- un repo compartido de plataforma
- dos repos de cliente
- un repo de tooling interno

Sin `gc-tree`, cada sesión nueva con IA obliga a volver a explicar:

- de qué cliente estamos hablando ahora
- qué repos forman realmente un mismo conjunto
- qué flujo importa en este contexto
- qué contexto sobra y solo mete ruido

Con `gc-tree`, puedes mantener contextos separados por carril, reutilizarlos entre sesiones y dejar que las reglas de repo scope bloqueen el contexto que no toca.

Ese es el trabajo real que resuelve:

> no “guardar más texto de prompt”,
> sino **gestionar el contexto correcto en el nivel correcto del trabajo**.

---

## Conceptos clave

- **gc-branch**
  Un carril de contexto duradero para un producto, cliente, workstream o dominio.

- **repo scope**
  Las reglas que deciden en qué repositorios debe aplicarse un contexto.

- **provider-guided flow**
  En vez de escribir JSON a mano, haces onboarding y actualizaciones desde tu herramienta de IA preferida.

- **context tree**
  Por dentro, `gc-tree` organiza el contexto como conocimiento en archivos, consciente de las ramas.
  Lo que tú ganas es contexto reutilizable más allá de un solo proyecto.

---

## Comandos visibles dentro del runtime

Después del scaffold, los comandos visibles son:

- **Codex:** `$gc-onboard`, `$gc-update-global-context`
- **Claude Code:** `/gc-onboard`, `/gc-update-global-context`

Esos comandos deben dejar claro cuál es el gc-branch activo antes de empezar a recoger o actualizar contexto duradero, y también deben mantener el idioma guardado hasta el final, salvo que el usuario pida cambiarlo explícitamente.

---

## Comandos clave de un vistazo

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

---

## Documentación

La documentación detallada está en el directorio [`docs/`](https://github.com/handsupmin/gc-tree/tree/main/docs).

- **Concepto** — [`docs/concept.es.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/concept.es.md)
  Explica qué es `gctree`, qué problema resuelve y cuál es el alcance de la capa de contexto global.
- **Principios** — [`docs/principles.es.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/principles.es.md)
  Resume las reglas de gc-branches, alcance por repositorio, documentos summary-first y actualizaciones guiadas.
- **Uso** — [`docs/usage.es.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/usage.es.md)
  Describe el flujo CLI estándar, los comandos del provider, el comportamiento de alcance por repo y los patrones de integración.
- **Desarrollo local** — [`docs/local-development.es.md`](https://github.com/handsupmin/gc-tree/blob/main/docs/local-development.es.md)
  Explica cómo instalar dependencias, ejecutar la CLI localmente y verificar cambios.

---

## Contribuir

Las contribuciones son bienvenidas. Consulta el documento en inglés [CONTRIBUTING.md](https://github.com/handsupmin/gc-tree/blob/main/CONTRIBUTING.md) para ver el flujo de desarrollo y la checklist de PR.

---

## Licencia

MIT. Consulta [`LICENSE`](https://github.com/handsupmin/gc-tree/blob/main/LICENSE).
