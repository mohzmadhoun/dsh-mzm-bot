import { describe, expect, it } from 'vitest'
import {
  WEDGE_PROVIDER_CREDENTIAL_REF_NAMES as desktopRefs,
  WEDGE_PROVIDER_IDS as desktopIds,
} from '../src/wedge-providers.ts'
import {
  WEDGE_PROVIDER_CREDENTIAL_REF_NAMES as packageRefs,
  WEDGE_PROVIDER_IDS as packageIds,
} from '../../../packages/credentials/credentials/src/provider-refs.ts'

describe('wedge provider credential refs parity (T013 / MOH-17)', () => {
  it('keeps Desktop map identical to packages/credentials provider-refs', () => {
    expect([...desktopIds]).toEqual([...packageIds])
    expect(desktopRefs).toEqual(packageRefs)
  })
})
