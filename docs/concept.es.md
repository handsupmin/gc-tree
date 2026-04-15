# Concepto

[English](concept.md) | [한국어](concept.ko.md) | [简体中文](concept.zh.md) | [日本語](concept.ja.md) | [Español](concept.es.md)

## Summary

`gctree` es una capa de contexto global pequeña y clara para herramientas de programación con IA. Mantiene el contexto duradero en documentos markdown fuera de un único repositorio, permite cambiarlo y consultarlo por gc-branch, y además puede limitar cada gc-branch a los repositorios donde realmente aplica.

## Qué es `gctree`

`gctree` es una CLI ligera para gestionar contexto global reutilizable.
Está pensada para personas y equipos que necesitan conservar el mismo contexto duradero entre varios repositorios, sesiones y herramientas.

En lugar de dejar ese conocimiento repartido entre archivos de prompts o depender de memoria oculta, `gctree` le da un lugar claro, estable y basado en archivos.

## Qué problema resuelve

Muchos entornos de programación con IA empiezan con una de estas opciones:

- un solo `AGENTS.md`
- un solo `CLAUDE.md`
- un archivo de prompts dentro del repositorio
- un conjunto de notas copiadas manualmente en los prompts

Eso funciona al principio, pero con el tiempo aparecen necesidades como estas:

- separar el contexto por producto o cliente
- mantener contexto fuera de un único repositorio
- reutilizar la misma documentación duradera desde varias herramientas
- encontrar el contexto correcto de forma rápida y consistente
- actualizar el contexto duradero de una forma más segura
- trabajar en paralelo en muchos repositorios y sesiones a la vez

`gctree` se ocupa precisamente de esa capa.

## Límite de alcance

`gctree` intencionalmente no es:

- un orquestador de entrega request-to-commit
- un sistema de memoria oculta
- un runtime de colaboración en navegador
- un producto generalista de base de conocimiento

Se centra en ramas reutilizables de contexto global y en flujos de actualización explícitos.

## Estructura de archivos

Un directorio home típico se ve así:

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

- `HEAD` indica el gc-branch activo de fallback.
- `settings.json` guarda el provider preferido.
- `branch-repo-map.json` guarda las reglas include/exclude por gc-branch.
- `branch.json` guarda metadatos ligeros del gc-branch.
- `index.md` es el punto de entrada compacto para las herramientas.
- `docs/` guarda los documentos markdown source-of-truth.

## Comportamiento con alcance por repositorio

Un gc-branch no tiene por qué aplicarse a todos los repositorios.
Si la rama `A` solo es relevante para `B`, `C` y `D`, eso puede registrarse en `branch-repo-map.json`.

Entonces, si ejecutas `gctree resolve` desde `F`, puedes elegir entre:

- continuar solo esta vez
- usar siempre esa rama en ese repo
- ignorarla en ese repo

Eso vuelve a `gctree` mucho más seguro para usuarios intensivos que mantienen muchas sesiones paralelas abiertas sobre repositorios no relacionados.
