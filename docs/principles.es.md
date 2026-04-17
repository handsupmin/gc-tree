# Principios

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## Resumen

`gctree` sigue unas pocas reglas de producto muy claras: mantener el contexto con conciencia de rama, mantener los documentos source con enfoque summary-first, mantener los índices ligeros y hacer explícito el repo scope para que cada gc-branch solo influya donde realmente le toca.

## 1. Mantén el contexto con conciencia de rama

Una misma máquina debería poder contener varios árboles de contexto global sin mezclarlos.
Por eso `gctree` usa lenguaje tipo Git como `checkout` y `checkout -b`, mientras que en la interfaz orientada al usuario se refiere a la rama activa como **gc-branch**.

## 2. Haz explícito el repo scope

Un gc-branch no debería afectar en silencio a todos los repositorios de la máquina.
`gctree` usa `branch-repo-map.json` para registrar si un repositorio está:

- incluido para un gc-branch
- excluido para un gc-branch
- todavía sin mapear

Si `resolve` se llama desde un repositorio no mapeado, la persona usuaria puede decidir si quiere continuar una vez, usar siempre ese gc-branch allí o ignorarlo en ese repo.

## 3. Mantén `index.md` ligero

El `index.md` de nivel superior es un índice, no un vertedero de contenido.
Su trabajo es ayudar a herramientas y personas a encontrar rápido el documento source correcto.
Debe seguir siendo compacto y orientado a enlaces, en lugar de duplicar todo el conocimiento en línea.

## 4. Haz que los documentos source sean summary-first

Todo documento markdown que actúe como source of truth debería incluir una sección `## Summary` cerca del inicio.
Eso le da a las herramientas una ruta rápida: leer primero la versión corta y ampliar solo cuando haga falta más detalle.

## 5. Haz que el onboarding sea explícito y guiado

Una persona no debería tener que escribir a mano un JSON de onboarding solo para crear un árbol de contexto útil.
`gctree init` y `gctree onboard` deberían guiar el flujo con el provider elegido y escribir el contexto resultante en el gc-branch activo.

El onboarding solo aplica a gc-branches vacíos.
Si un gc-branch ya contiene contexto, el camino correcto es uno de estos dos:

- restablecer ese gc-branch y volver a hacer onboarding
- o lanzar una actualización duradera guiada

## 6. Haz que las actualizaciones duraderas sean intencionales

El contexto duradero no debería cambiar por accidente ni a través de memoria oculta.
El flujo de actualización debe ser explícito, guiado por el provider y estar ligado al gc-branch activo en ese momento.
