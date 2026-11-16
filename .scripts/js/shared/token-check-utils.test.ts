import {
  compareWithBaseline,
  declaredProperties,
  findParityGaps,
  findTierLeaks,
  findUndefinedReferences,
  inlineStyleProperties,
} from './token-check-utils.mjs';

const theme = (button: Record<string, unknown>) => ({
  click: {
    global: {
      color: { text: { default: { value: '{palette.slate.900}', type: 'color' } } },
    },
    button,
  },
});

describe('findTierLeaks', () => {
  it('flags component colours that alias the palette or hold a raw value', () => {
    const leaks = findTierLeaks(
      theme({
        primary: { value: '{palette.slate.800}', type: 'color' },
        danger: { value: '#ff2323', type: 'color' },
        secondary: { value: '{click.global.color.text.default}', type: 'color' },
        padding: { value: '{spaces.2}', type: 'spacing' },
      })
    );
    expect(leaks).toEqual([
      'click.button.danger -> #ff2323',
      'click.button.primary -> {palette.slate.800}',
    ]);
  });

  it('does not flag the semantic tier itself', () => {
    expect(findTierLeaks(theme({}))).toEqual([]);
  });
});

describe('findParityGaps', () => {
  it('reports paths missing from either theme', () => {
    const light = theme({ a: { value: '#000', type: 'color' } });
    const dark = theme({ b: { value: '#fff', type: 'color' } });
    expect(findParityGaps(light, dark)).toEqual({
      lightOnly: ['click.button.a'],
      darkOnly: ['click.button.b'],
    });
  });
});

describe('findUndefinedReferences', () => {
  it('reports var() references nothing declares, with line numbers', () => {
    const css =
      '.a {\n  color: var(--click-real);\n  transition: var(--click-missing);\n}';
    const known = declaredProperties(':root { --click-real: red; }');
    expect(findUndefinedReferences(css, known)).toEqual([
      { name: '--click-missing', line: 3 },
    ]);
  });

  it('accepts inline style keys and runtime Radix properties', () => {
    const known = inlineStyleProperties("const style = { '--badge-width': width };");
    const css =
      '.a { width: var(--badge-width); max-height: var(--radix-popover-content-available-height); }';
    expect(findUndefinedReferences(css, known)).toEqual([]);
  });

  it('ignores references inside comments', () => {
    expect(findUndefinedReferences('/* var(--gone) */ .a {}', new Set())).toEqual([]);
  });
});

describe('compareWithBaseline', () => {
  it('separates new debt from fixed debt', () => {
    expect(compareWithBaseline({ leaks: ['a', 'c'] }, { leaks: ['a', 'b'] })).toEqual({
      leaks: { added: ['c'], resolved: ['b'] },
    });
  });
});
