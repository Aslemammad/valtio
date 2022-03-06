import {vitePluginMacro} from 'vite-plugin-macro'
import { defineMacro, defineMacroProvider } from '@typed-macro/core'
// @ts-ignore
import { addNamed } from '@babel/helper-module-imports'
import { MacroError } from 'babel-plugin-macros'
import * as t from '@babel/types'

export const valtioMacro = defineMacro(`useProxy`)
  .withSignature(
    `<T extends object>(proxyObject: T): void`,
  )
  .withHandler((ctx) => {
    const { path, args } = ctx
    const hook = addNamed(path, 'useSnapshot', 'valtio')
    const proxy = args[0]?.node

    if (!t.isIdentifier(proxy)) throw new MacroError('no proxy object')

    const snap = t.identifier(`valtio_macro_snap_${proxy.name}`)
    path.parentPath?.replaceWith(
      t.variableDeclaration('const', [
        t.variableDeclarator(snap, t.callExpression(hook, [proxy])),
      ])
    )

    let inFunction = 0
    path.parentPath?.getFunctionParent()?.traverse({
      Identifier(p) {
        if (
          inFunction === 0 && // in render
          p.node !== proxy &&
          p.node.name === proxy.name
        ) {
          p.node.name = snap.name
        }
      },
      Function: {
        enter() {
          ++inFunction
        },
        exit() {
          --inFunction
        },
      },
    })
  })

export function provideValtioMacro() {
  return defineMacroProvider({
    id: 'valtio/macro',
    exports: {
      'valtio/macro': {
        macros: [valtioMacro],
      },
    },
  })
}

// const plugin = vitePluginMacro().use(provideValtioMacro()).toPlugin()

// export default plugin

