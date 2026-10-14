import {
  COLORES_PREDETERMINADOS,
  CONTRASTE_MINIMO,
  contraste,
  detectarTipoImagen,
  normalizarColor,
  validarColores,
} from './apariencia';

/** ADR-0010: los colores y el logo de la institución se cambian sin tocar el código. */
describe('Apariencia de la institución (ADR-0010)', () => {
  describe('normalizarColor', () => {
    it('debe aceptar un color hexadecimal de 6 dígitos y devolverlo en mayúsculas', () => {
      expect(normalizarColor('#1d4e89')).toBe('#1D4E89');
    });

    it.each(['1D4E89', '#FFF', '#GGGGGG', 'rojo', '#1D4E8900'])(
      'debe rechazar el valor %s',
      (valor) => {
        expect(() => normalizarColor(valor)).toThrow('Color inválido');
      },
    );
  });

  describe('contraste (WCAG 2.1)', () => {
    it('debe dar 21 entre negro y blanco', () => {
      expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    });

    it('debe dar 1 entre dos colores iguales', () => {
      expect(contraste('#1D4E89', '#1D4E89')).toBeCloseTo(1, 5);
    });

    it('debe ser simétrico', () => {
      expect(contraste('#13283F', '#FFFFFF')).toBeCloseTo(contraste('#FFFFFF', '#13283F'), 10);
    });
  });

  describe('validarColores', () => {
    it('debe aceptar los colores predeterminados del diseño', () => {
      expect(validarColores(COLORES_PREDETERMINADOS)).toEqual(COLORES_PREDETERMINADOS);
    });

    it('debe rechazar un color de marca o primario con poco contraste para texto blanco', () => {
      expect(() => validarColores({ ...COLORES_PREDETERMINADOS, primario: '#F2B33D' })).toThrow(
        `El color primario no tiene contraste suficiente con el texto blanco (mínimo ${CONTRASTE_MINIMO}:1)`,
      );
      expect(() => validarColores({ ...COLORES_PREDETERMINADOS, marca: '#A9BACB' })).toThrow(
        'El color de marca no tiene contraste suficiente',
      );
    });

    it('debe rechazar un acento que no se distingue sobre el color de marca', () => {
      expect(() => validarColores({ ...COLORES_PREDETERMINADOS, acento: '#1D3550' })).toThrow(
        'El color de acento no se distingue sobre el color de marca',
      );
    });
  });

  describe('detectarTipoImagen', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
    const webp = Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1');

    it('debe reconocer PNG, JPEG y WebP por su contenido, no por el nombre', () => {
      expect(detectarTipoImagen(png)).toBe('image/png');
      expect(detectarTipoImagen(jpeg)).toBe('image/jpeg');
      expect(detectarTipoImagen(webp)).toBe('image/webp');
    });

    it('debe rechazar SVG, GIF y otros formatos (un SVG puede llevar código)', () => {
      expect(
        detectarTipoImagen(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
      ).toBeNull();
      expect(detectarTipoImagen(Buffer.from('GIF89a'))).toBeNull();
      expect(detectarTipoImagen(Buffer.alloc(0))).toBeNull();
    });
  });
});
