// Tests del campo de edad del panel: solo dígitos y rango cerrado 5–18.
// Es la única barrera del formulario, así que lo que no pase aquí llega al caso.
//
//   cd frontend && npm test
import test from 'node:test'
import assert from 'node:assert/strict'

import { EDAD_MAX, EDAD_MIN, edadValida, soloDigitos } from '../components/panel/edad.js'

test('el rango es 5–18', () => {
  assert.equal(EDAD_MIN, 5)
  assert.equal(EDAD_MAX, 18)
})

test('soloDigitos tira todo lo que no sea dígito', () => {
  assert.equal(soloDigitos('12'), '12')
  assert.equal(soloDigitos('1a2'), '12')
  assert.equal(soloDigitos('-7'), '7')
  assert.equal(soloDigitos('1.5'), '15')
  assert.equal(soloDigitos('1e3'), '13')
  assert.equal(soloDigitos(' 9 '), '9')
  assert.equal(soloDigitos('abc'), '')
  assert.equal(soloDigitos(null), '')
  assert.equal(soloDigitos(undefined), '')
})

test('soloDigitos no deja más de dos cifras ni ceros a la izquierda', () => {
  assert.equal(soloDigitos('123'), '12')
  assert.equal(soloDigitos('05'), '5')
  assert.equal(soloDigitos('0007'), '7')
  assert.equal(soloDigitos('0'), '0')
})

test('edadValida acepta justo los enteros de 5 a 18', () => {
  for (let n = EDAD_MIN; n <= EDAD_MAX; n += 1) {
    assert.equal(edadValida(String(n)), true, `edad ${n}`)
    assert.equal(edadValida(n), true, `edad ${n} como número`)
  }
  for (const mala of ['', ' ', '4', '19', '0', '04.5', '-6', 'abc', null, undefined, NaN]) {
    assert.equal(edadValida(mala), false, `edad ${String(mala)}`)
  }
})
