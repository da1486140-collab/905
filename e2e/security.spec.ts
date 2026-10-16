import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const ALLOWED = process.env.E2E_ALLOW === '1'
const SUPA_URL = process.env.E2E_SUPABASE_URL!
const SUPA_ANON = process.env.E2E_SUPABASE_ANON_KEY!
const ADMIN_LOGIN = process.env.E2E_ADMIN_LOGIN!
const ADMIN_PW = process.env.E2E_ADMIN_PASSWORD!
const SV_LOGIN = process.env.E2E_SV_LOGIN!
const SV_PW = process.env.E2E_SV_PASSWORD!

test.skip(!ALLOWED, 'E2E_ALLOW=1 required')

function anonClient() {
  return createClient(SUPA_URL, SUPA_ANON)
}

async function svClient() {
  const c = createClient(SUPA_URL, SUPA_ANON)
  const email = `${SV_LOGIN.toLowerCase().trim()}@sklad.internal`
  await c.auth.signInWithPassword({ email, password: SV_PW })
  return c
}

test.describe('Security — anon', () => {
  test('privileged RPCs are blocked for anon', async () => {
    const c = anonClient()
    const { error: e1 } = await c.rpc('_insert_move' as never, {} as never)
    expect(e1).toBeTruthy()
    const { error: e2 } = await c.rpc('_next_doc_number' as never, {} as never)
    expect(e2).toBeTruthy()
    const { error: e3 } = await c.rpc('post_move' as never, {} as never)
    expect(e3).toBeTruthy()
  })

  test('needs_bootstrap works for anon', async () => {
    const c = anonClient()
    const { data, error } = await c.rpc('needs_bootstrap')
    expect(error).toBeNull()
    expect(typeof data).toBe('boolean')
  })
})

test.describe('Security — supervisor', () => {
  test('privileged RPCs are blocked for supervisor', async () => {
    const c = await svClient()
    const { error: e1 } = await c.rpc('_insert_move' as never, {} as never)
    expect(e1).toBeTruthy()
    const { error: e2 } = await c.rpc('_reverse_cleaning_moves' as never, {} as never)
    expect(e2).toBeTruthy()
    const { error: e3 } = await c.rpc('post_document' as never, {} as never)
    expect(e3).toBeTruthy()
  })

  test('supervisor cannot read stock_moves or items', async () => {
    const c = await svClient()
    const { data: sm, error: sme } = await c.from('stock_moves').select()
    if (sme) {
      expect(sme).toBeTruthy()
    } else {
      expect(sm).toHaveLength(0)
    }
    const { data: it, error: ite } = await c.from('items').select()
    if (ite) {
      expect(ite).toBeTruthy()
    } else {
      expect(it).toHaveLength(0)
    }
  })

  test('supervisor cannot update events', async () => {
    const c = await svClient()
    const { error } = await c.from('events').update({ processed: true } as never).eq('id', 999999 as never)
    expect(error).toBeTruthy()
  })
})
