# Concepto

[English](concept.md) | [한국어](concept.ko.md) | [简体中文](concept.zh.md) | [日本語](concept.ja.md) | [Español](concept.es.md)

## Resumen

`gctree` es una capa de contexto global ligera para herramientas de programación con IA. Mantiene el contexto de larga duración en documentos markdown explícitos fuera de cualquier repositorio individual, permite cambiar entre gc-branches y puede limitar cada gc-branch a los repositorios donde realmente corresponde.

## Qué es `gctree`

`gctree` es una CLI para gestionar contexto global reutilizable.
Está pensada para personas y equipos que quieren que el contexto importante persista entre repositorios, sesiones y herramientas sin convertirse en memoria oculta.

En lugar de dispersar conocimiento clave entre archivos de prompt, notas locales de cada repositorio e instrucciones puntuales, `gctree` le da a ese conocimiento un lugar estable y respaldado por archivos donde vivir.

## Qué problema resuelve

Muchas configuraciones de programación con IA empiezan siendo pequeñas:

- un `AGENTS.md`
- un `CLAUDE.md`
- un archivo de prompt local en el repositorio
- algunas notas copiadas en los prompts cuando se necesitan

Eso funciona un tiempo. Luego llega el trabajo real y comienzan a aparecer las fisuras:

- diferentes productos necesitan contexto diferente
- el trabajo para clientes necesita un aislamiento limpio
- las guías reutilizables deberían vivir fuera de cualquier repositorio individual
- múltiples herramientas deberían poder leer la misma fuente de verdad
- el contexto de larga duración debería cambiar mediante un flujo explícito y revisable
- una persona puede tener muchas sesiones abiertas en varios repositorios al mismo tiempo

`gctree` existe para gestionar esa capa de forma limpia.

## Cómo funciona resolve

Cuando una herramienta llama a `gctree resolve --query "..."`, gc-tree puntúa cada documento de la gc-branch activa contra la consulta usando coincidencia de palabras clave con soporte Unicode (las consultas en coreano, CJK e idiomas mixtos funcionan igual que en inglés). Las coincidencias en el título cuentan el doble que las coincidencias en el cuerpo.

La herramienta recibe únicamente los documentos que coinciden — título, resumen y fragmento — no la base de conocimiento completa. En la práctica, esto significa que se inyecta aproximadamente el 4 % del contexto total por consulta. La herramienta lee el documento completo solo cuando el resumen no es suficiente.

Esto mantiene el uso de tokens bajo sin ocultar nada. Todo el contexto sigue siendo explícito, respaldado por archivos y revisable.

## Compatibilidad con proveedores

`gctree` funciona tanto con Claude Code como con Codex. Ambos proveedores usan el mismo almacén de contexto subyacente. Haz scaffold una vez y ambas herramientas podrán hacer resolve, onboard y actualizar el contexto desde la misma gc-branch.

## Límite de alcance

`gctree` intencionalmente no es:

- un orquestador de entregas de solicitud a commit
- un sistema de memoria oculta
- un entorno de colaboración en el navegador
- un producto de base de conocimiento de propósito general

Se centra en un único trabajo: gestionar gc-branches de contexto global reutilizable y actualizaciones duraderas explícitas.

## Modelo de archivos

Un directorio de inicio típico tiene este aspecto:

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

- `HEAD` registra la gc-branch activa predeterminada.
- `settings.json` almacena el modo de proveedor, el proveedor de onboarding elegido para el lanzamiento en tiempo de ejecución y el idioma de trabajo preferido.
- `branch-repo-map.json` almacena qué repositorios están incluidos o excluidos para cada gc-branch.
- `branch.json` almacena metadatos ligeros de la gc-branch.
- `index.md` es el punto de entrada compacto para las herramientas — se mantiene compacto agrupando todas las palabras clave bajo cada ruta de documento en lugar de repetir la ruta por cada palabra clave.
- `docs/` contiene los documentos markdown que son la fuente de verdad. Cada doc debe tener un `## Summary` accionable (patrones y comandos reales, no una descripción) y una sección `## Index Entries` con muchas palabras clave buscables.

## Comportamiento según el repositorio

Una gc-branch no tiene que aplicarse en todos lados.
Si la branch `A` solo es relevante para los repositorios `B`, `C` y `D`, `gctree` puede registrar eso en `branch-repo-map.json`.

Cuando `gctree resolve` se ejecuta en otro repositorio como `F`, puede:

- continuar una vez
- usar siempre esa gc-branch en `F`
- ignorar esa gc-branch en `F`

Esto hace que gc-tree sea mucho más seguro para usuarios avanzados que mantienen muchas sesiones paralelas abiertas en repositorios no relacionados.
