import { describe, it, expect } from 'vitest';
import { xmlText, decodeXmlEntities } from '../src/util/xml';

describe('xml helpers', () => {
  it('extracts element text by local name, ignoring namespace prefix', () => {
    const xml = '<cp:coreProperties><dc:title>Hello World</dc:title><dc:creator>Nico</dc:creator></cp:coreProperties>';
    expect(xmlText(xml, 'title')).toBe('Hello World');
    expect(xmlText(xml, 'creator')).toBe('Nico');
  });

  it('returns undefined for missing, empty, or self-closing elements', () => {
    expect(xmlText('<a><dc:title/></a>', 'title')).toBeUndefined();
    expect(xmlText('<a><dc:title></dc:title></a>', 'title')).toBeUndefined();
    expect(xmlText('<a></a>', 'subject')).toBeUndefined();
  });

  it('decodes entities and handles attributes on the tag', () => {
    expect(xmlText('<w:t xml:space="preserve">a &amp; b &lt; c</w:t>', 't')).toBe('a & b < c');
    expect(decodeXmlEntities('&#65;&#x42;')).toBe('AB');
  });
});
