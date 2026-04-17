# Principios

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## Summary

`gctree` sigue un conjunto pequeño pero claro de principios de producto: separar el contexto por gc-branch, escribir documentos summary-first, mantener los índices livianos y hacer que cada gc-branch solo influya en los repositorios donde realmente corresponde.

## 1. Separar el contexto por gc-branch

Una sola máquina puede contener varios árboles de contexto global sin mezclarlos.
Por eso `gctree` usa comandos al estilo git como `checkout` y `checkout -b`, pero en la interfaz deja claro que la rama activa se presenta como **gc-branch**.

## 2. Gestionar explícitamente el alcance por repositorio

Un gc-branch no debería afectar en silencio a todos los repositorios de la máquina.
`gctree` usa `branch-repo-map.json` para registrar el estado de un repo respecto a un gc-branch:

- include
- exclude
- aún sin mapear

Si `resolve` se ejecuta en un repo sin mapear, el usuario puede decidir si quiere continuar solo esta vez, usar siempre ese gc-branch allí o ignorarlo allí.

## 3. Mantener `index.md` liviano

El `index.md` de nivel superior es un índice, no un volcado de conocimiento.
Su trabajo es llevar a herramientas y personas rápidamente al documento fuente correcto.

## 4. Priorizar documentos summary-first

Cada documento markdown source-of-truth debería incluir una sección `## Summary` cerca del inicio.
Así las herramientas pueden leer primero la versión corta y abrir el resto solo cuando haga falta.

## 5. Hacer que el onboarding sea explícito y guiado

El usuario no debería tener que escribir JSON a mano para crear un contexto global útil.
`gctree init` y `gctree onboard` deberían guiar la conversación a través del provider elegido y guardar el resultado en el gc-branch activo.

El onboarding solo aplica a gc-branches vacíos.
Si un gc-branch ya tiene contexto, la ruta correcta es:

- resetear ese gc-branch y volver a hacer onboarding
- o ejecutar una actualización duradera guiada

## 6. Mantener las actualizaciones duraderas bajo control

El contexto duradero no debería cambiar por accidente ni por memoria oculta.
El flujo de actualización debe ser explícito, guiado por el provider y siempre ligado al gc-branch activo.
