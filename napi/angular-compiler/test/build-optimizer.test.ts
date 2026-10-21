import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildOptimizerPlugin } from '../vite-plugin/angular-build-optimizer-plugin.js'

let root: string

function writePackage(name: string, sideEffects: unknown, files: Record<string, string>) {
  const dir = join(root, 'node_modules', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, sideEffects }))
  for (const [file, code] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, file)), { recursive: true })
    writeFileSync(join(dir, file), code)
  }
}

async function optimize(file: string, code: string) {
  const plugin = buildOptimizerPlugin({ jit: false, sourcemap: false, thirdPartySourcemaps: false })
  ;(plugin as any).config({ mode: 'production' })
  const result = await (plugin as any).transform.handler.call(
    {},
    code,
    join(root, 'node_modules', file),
  )
  return result.code as string
}

const ZONE = `var Zone2 = loadZone();
patchCommon(Zone2);
`
const PUBLISH_FACADE = `publishFacade(_global);
`
const TOKEN = `const TOKEN = new InjectionToken('TOKEN');
const VERSION = new Version('22.0.0');
`
const STATIC_MEMBERS = `let Service = class Service {};
Service.ɵfac = function Service_Factory(t) { return new (t || Service)(); };
export { Service };
`

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'build-optimizer-test-')))
  writePackage('zone.js', undefined, { 'fesm2015/zone.js': ZONE })
  writePackage('@angular/core', false, {
    'fesm2022/core.mjs': TOKEN,
    'fesm2022/service.mjs': STATIC_MEMBERS,
  })
  writePackage('@angular/compiler', ['./fesm2022/compiler.mjs'], {
    'fesm2022/compiler.mjs': PUBLISH_FACADE,
    'fesm2022/other.mjs': TOKEN,
  })
  writePackage('@angular/localize', ['*.mjs'], { 'fesm2022/localize.mjs': PUBLISH_FACADE })
  writePackage('@angular/animations', [], { 'fesm2022/animations.mjs': TOKEN })
  writePackage('@ngrx/store', false, { 'fesm2022/ngrx-store.mjs': TOKEN })
  writePackage('side-effectful', true, { 'fesm2022/side-effectful.mjs': STATIC_MEMBERS })
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('build optimizer: package sideEffects', () => {
  it('keeps top-level calls of a package without a sideEffects field', async () => {
    const code = await optimize('zone.js/fesm2015/zone.js', ZONE)

    expect(code).not.toContain('__PURE__')
    expect(code).toContain('patchCommon(Zone2)')
  })

  it('marks top-level calls pure in a side-effect-free @angular package', async () => {
    const code = await optimize('@angular/core/fesm2022/core.mjs', TOKEN)

    expect(code).toContain("/* @__PURE__ */ new InjectionToken('TOKEN')")
    expect(code).toContain("/* @__PURE__ */ new Version('22.0.0')")
  })

  it('keeps top-level calls of a file listed in the sideEffects array', async () => {
    const code = await optimize('@angular/compiler/fesm2022/compiler.mjs', PUBLISH_FACADE)

    expect(code).not.toContain('__PURE__')
  })

  it('marks top-level calls pure in a file not listed in the sideEffects array', async () => {
    const code = await optimize('@angular/compiler/fesm2022/other.mjs', TOKEN)

    expect(code).toContain("/* @__PURE__ */ new InjectionToken('TOKEN')")
  })

  it('matches a sideEffects pattern without a slash in any directory', async () => {
    const code = await optimize('@angular/localize/fesm2022/localize.mjs', PUBLISH_FACADE)

    expect(code).not.toContain('__PURE__')
  })

  it('treats an empty sideEffects array as side-effect-free', async () => {
    const code = await optimize('@angular/animations/fesm2022/animations.mjs', TOKEN)

    expect(code).toContain("/* @__PURE__ */ new InjectionToken('TOKEN')")
  })

  it('only marks top-level calls pure in @angular packages, like the Angular CLI', async () => {
    const code = await optimize('@ngrx/store/fesm2022/ngrx-store.mjs', TOKEN)

    expect(code).not.toContain('__PURE__')
  })

  it('still wraps static members of packages with side effects', async () => {
    const code = await optimize('side-effectful/fesm2022/side-effectful.mjs', STATIC_MEMBERS)

    expect(code).toMatch(/let Service = \/\*\s*[@#]__PURE__\s*\*\/ \(\(\) => \{/)
  })
})
