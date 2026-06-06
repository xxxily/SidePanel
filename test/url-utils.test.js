import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createSiteFromUrl,
  getDisplayHost,
  getOriginPattern,
  normalizeHttpUrl
} from '../src/url-utils.js';

describe('normalizeHttpUrl', () => {
  it('adds https to ordinary hostnames', () => {
    assert.equal(normalizeHttpUrl('example.com/path'), 'https://example.com/path');
  });

  it('keeps localhost ports as host input, not as a custom scheme', () => {
    assert.equal(normalizeHttpUrl('localhost:3000'), 'https://localhost:3000/');
  });

  it('canonicalizes explicit http and https URLs', () => {
    assert.equal(normalizeHttpUrl('https://example.com'), 'https://example.com/');
    assert.equal(normalizeHttpUrl('http://example.com/a b'), 'http://example.com/a%20b');
  });

  it('rejects unsupported explicit schemes', () => {
    assert.equal(normalizeHttpUrl('ftp://example.com'), null);
    assert.equal(normalizeHttpUrl('chrome://extensions'), null);
    assert.equal(normalizeHttpUrl('javascript:alert(1)'), null);
  });

  it('rejects malformed URLs', () => {
    assert.equal(normalizeHttpUrl('https://'), null);
    assert.equal(normalizeHttpUrl('example.com:bad-port'), null);
  });
});

describe('URL helpers', () => {
  it('builds origin permission match patterns', () => {
    assert.equal(getOriginPattern('https://example.com/docs'), 'https://example.com/*');
    assert.equal(getOriginPattern('http://localhost:5173/a'), 'http://localhost:5173/*');
  });

  it('derives display hostnames', () => {
    assert.equal(getDisplayHost('https://www.example.com/a'), 'example.com');
  });

  it('creates canonical site records', () => {
    assert.deepEqual(createSiteFromUrl('example.com', ' Example ', ''), {
      name: 'Example',
      icon: '🌐',
      url: 'https://example.com/'
    });
  });
});
