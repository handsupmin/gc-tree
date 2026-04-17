# Concepto

[English](concept.md) | [한국어](concept.ko.md) | [简体中文](concept.zh.md) | [日本語](concept.ja.md) | [Español](concept.es.md)

## Resumen

`gctree` es una capa ligera de contexto global para herramientas de programación con IA. Mantiene el contexto duradero en documentos markdown explícitos fuera de cualquier repositorio individual, permite cambiar entre gc-branches y puede limitar cada gc-branch a los repositorios donde realmente tiene sentido.

## Qué es `gctree`

`gctree` es una CLI para gestionar contexto global reutilizable.
Está pensada para equipos y personas que quieren que el contexto de largo recorrido sobreviva entre repositorios, sesiones y herramientas, sin convertirlo en una memoria oculta imposible de inspeccionar.

En lugar de repartir el conocimiento importante entre archivos de prompt, notas locales al repo e instrucciones improvisadas, `gctree` le da a ese conocimiento un hogar estable, visible y respaldado por archivos.

## Qué problema resuelve

Muchos entornos de programación con IA empiezan de forma bastante simple:

- un `AGENTS.md`
- un `CLAUDE.md`
- un archivo de prompt dentro del repo
- unas pocas notas que se copian al prompt cuando hacen falta

Eso funciona durante un tiempo. Pero cuando empiezan a aparecer necesidades reales, la misma configuración empieza a romperse:

- cada producto necesita un contexto distinto
- el trabajo para clientes debe mantenerse aislado
- la guía reutilizable debería vivir fuera de un único repositorio
- varias herramientas deberían poder leer la misma source of truth
- el contexto duradero debería evolucionar con un flujo seguro y revisable
- una misma persona puede tener muchas sesiones abiertas en muchos repos a la vez

`gctree` existe para resolver precisamente esa capa del problema, y hacerlo de forma limpia.

## Límite de alcance

`gctree` no pretende ser:

- un orquestador integral que lleve una petición hasta el commit
- un sistema de memoria oculta
- un runtime de colaboración en navegador
- un producto de base de conocimiento de propósito general

Se concentra en una sola tarea: gestionar ramas de contexto global reutilizable y sus actualizaciones explícitas.

## Modelo de archivos

Un directorio personal típico queda así:

```text
~/.gctree/
  HEAD
  settings.json
  branch-repo-map.json
  branches/
    main/
      branch.json
      index.md
      docs/
```

- `HEAD` sigue el gc-branch activo por defecto.
- `settings.json` guarda el modo de provider, el provider elegido para lanzar el onboarding en runtime y el idioma preferido del flujo.
- `branch-repo-map.json` guarda qué repositorios están incluidos o excluidos para cada gc-branch.
- `branch.json` guarda metadatos ligeros del gc-branch.
- `index.md` es el punto de entrada compacto para herramientas y personas.
- `docs/` contiene los documentos markdown que actúan como source of truth.

## Comportamiento con conciencia de repositorio

Un gc-branch no tiene por qué aplicarse en todas partes.
Si la rama `A` solo es relevante para los repositorios `B`, `C` y `D`, `gctree` puede dejarlo registrado en `branch-repo-map.json`.

Cuando `gctree resolve` se ejecuta desde otro repositorio, por ejemplo `F`, puede:

- continuar solo una vez
- usar siempre ese gc-branch en `F`
- ignorar ese gc-branch en `F`

Eso hace que gc-tree sea mucho más seguro para quienes mantienen muchas sesiones paralelas abiertas en repositorios que no tienen relación entre sí.
