# Principios

[English](principles.md) | [한국어](principles.ko.md) | [简体中文](principles.zh.md) | [日本語](principles.ja.md) | [Español](principles.es.md)

## Resumen

`gctree` sigue un pequeño conjunto de reglas de producto: mantener el contexto consciente de las branches, mantener los documentos fuente con el resumen primero, mantener los índices compactos, hacer el alcance del repositorio explícito, inyectar solo lo relevante y admitir cualquier proveedor que pueda ejecutar comandos de shell.

## 1. Mantener el contexto consciente de las branches

Una misma máquina debe poder mantener múltiples árboles de contexto global sin mezclarlos entre sí.
Por eso `gctree` usa terminología similar a git como `checkout` y `checkout -b`, aunque sigue refiriéndose a la branch activa como **gc-branch** en el texto orientado al usuario.

## 2. Mantener el alcance del repositorio explícito

Una gc-branch no debería afectar silenciosamente a todos los repositorios de la máquina.
`gctree` usa `branch-repo-map.json` para registrar si un repositorio está:

- incluido para una gc-branch
- excluido para una gc-branch
- aún no mapeado

Si se llama a `resolve` desde un repositorio no mapeado, el usuario puede decidir si continuar una vez, usar siempre esa gc-branch allí o ignorarla.

## 3. Mantener `index.md` compacto y rico en palabras clave

El `index.md` de nivel superior es un índice, no un volcado.
Su función es ayudar a las herramientas y a las personas a encontrar rápidamente el documento fuente correcto.

El formato agrupa las palabras clave bajo cada ruta de documento, eliminando las entradas de ruta repetidas:

```
- docs/workflows/db.md
  - DB migration
  - prisma schema
  - poetry run rev
  - model.py
```

Esto mantiene el índice compacto a la vez que maximiza la superficie de búsqueda. Cada documento debe tener tantas palabras clave relevantes como sea posible — aliases, nombres de comandos, nombres de campos, acrónimos y términos relacionados — para que cualquier consulta razonable encuentre algo útil.

## 4. Hacer que los documentos fuente empiecen con un resumen con contenido accionable

Cada documento markdown que sea fuente de verdad debe incluir una sección `## Summary` cerca del principio.
Esa sección se inyecta en el contexto de la IA antes de cada tarea, por lo que debe contener **patrones, comandos y restricciones reales**, no una descripción de lo que cubre el documento.

Mal resumen: `"This document describes the updateCollection pattern."`
Buen resumen: `"updateCollection: spread { ...dto } into body. Return plainToInstance(Res, result satisfies Res). New field order: DTO → service → controller."`

Un resumen que parece una entrada de tabla de contenidos es inútil. La IA lo ignorará y irá directo al código.

## 5. Hacer el onboarding explícito y guiado

Un usuario no debería tener que escribir a mano JSON de onboarding solo para crear un árbol de contexto útil.
`gctree init` y `gctree onboard` deben guiar al usuario a través de su proveedor preferido, habilitar ese proveedor globalmente y escribir el contexto resultante en la gc-branch activa.

El onboarding es solo para gc-branches vacías.
Si una gc-branch ya contiene contexto, el camino correcto es:

- resetear esa gc-branch y hacer onboarding de nuevo
- o ejecutar una actualización duradera guiada

## 6. Mantener las actualizaciones duraderas intencionales

El contexto duradero no debería cambiar por accidente ni a través de memoria oculta.
El flujo de actualización debe ser explícito, impulsado por el proveedor y vinculado a la gc-branch actualmente activa.

## 7. Inyectar solo lo relevante

Una sesión de herramienta nunca debería recibir la base de conocimiento completa.
`gctree resolve` puntúa los documentos contra la consulta y devuelve solo los que coinciden — título, resumen y fragmento. El documento completo se lee solo cuando el resumen no es suficiente.

En la práctica, esto significa que se inyecta aproximadamente el 4 % del contexto almacenado total por consulta. El 96 % restante permanece en disco, fuera de la ventana de tokens, hasta que se necesite realmente.

## 8. Mantenerse agnóstico al proveedor

`gctree` almacena el contexto en archivos markdown simples que cualquier herramienta puede leer.
Claude Code y Codex usan el mismo almacén subyacente. `gctree init` instala la superficie global de hooks orientada al proveedor, y `gctree scaffold` es la ruta de override local para un repositorio o workspace concreto.
Agregar soporte para un nuevo proveedor significa escribir una nueva plantilla de scaffold — sin cambios en la lógica central de almacenamiento ni de resolve.
