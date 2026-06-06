import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));

describe('extension manifest', () => {
  it('uses optional host permissions instead of install-time all-URL host access', () => {
    assert.equal(manifest.host_permissions, undefined);
    assert.deepEqual(manifest.optional_host_permissions, ['http://*/*', 'https://*/*']);
    assert.ok(manifest.permissions.includes('activeTab'));
  });

  it('declares context menu icons through extension icons', () => {
    assert.equal(manifest.icons['16'], 'icons/icon-16.png');
    assert.equal(manifest.action.default_icon['16'], 'icons/icon-16.png');
  });

  it('keeps DNR dynamic rather than stale static rulesets', () => {
    assert.equal(manifest.declarative_net_request, undefined);
    assert.ok(manifest.permissions.includes('declarativeNetRequest'));
    assert.ok(manifest.permissions.includes('declarativeNetRequestWithHostAccess'));
  });

  it('declares customizable shortcuts for current-page sidebar actions', () => {
    assert.equal(
      manifest.commands['open-current-page-in-sidebar'].suggested_key.default,
      'Alt+Shift+S'
    );
    assert.equal(
      manifest.commands['open-current-page-in-sidebar'].suggested_key.mac,
      'MacCtrl+Shift+S'
    );
    assert.equal(
      manifest.commands['add-current-page-to-sidebar'].suggested_key.default,
      'Alt+Shift+A'
    );
    assert.equal(
      manifest.commands['add-current-page-to-sidebar'].suggested_key.mac,
      'MacCtrl+Shift+A'
    );
  });
});
