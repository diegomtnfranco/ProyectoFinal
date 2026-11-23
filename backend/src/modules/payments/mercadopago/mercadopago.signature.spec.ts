import { createHmac } from 'crypto';
import { buildManifest, verifyMercadoPagoSignature } from './mercadopago.signature';

const secret = 'test-webhook-secret';
const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex');

describe('verifyMercadoPagoSignature', () => {
  const ts = '1742505638683';
  const requestId = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e';

  it('arma el manifest como indica la documentación', () => {
    expect(buildManifest('123456', requestId, ts)).toBe(`id:123456;request-id:${requestId};ts:${ts};`);
    expect(buildManifest('ORD01ABC', null, ts)).toBe(`id:ord01abc;ts:${ts};`);
  });

  it('acepta una firma válida', () => {
    const v1 = sign(`id:123456;request-id:${requestId};ts:${ts};`);
    expect(
      verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId: '123456', secret }),
    ).toBe(true);
  });

  it('rechaza firmas alteradas, otro data.id u otra clave', () => {
    const v1 = sign(`id:123456;request-id:${requestId};ts:${ts};`);
    const base = { xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId: '123456', secret };
    expect(verifyMercadoPagoSignature({ ...base, dataId: '999' })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, secret: 'otra' })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, xSignature: `ts=${ts},v1=${'0'.repeat(64)}` })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, xSignature: `ts=${Number(ts) + 1},v1=${v1}` })).toBe(false);
  });

  it('rechaza encabezados ausentes o mal formados', () => {
    expect(verifyMercadoPagoSignature({ xSignature: null, dataId: '1', secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: 'basura', dataId: '1', secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: 'ts=1,v1=zz', dataId: '1', secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: 'ts=1,v1=ab', dataId: '1', secret: '' })).toBe(false);
  });
});
