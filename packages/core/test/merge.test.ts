import { describe, expect, it } from 'vitest';

import {
  RC_2_SCHEMA_URI,
  areMcpDescriptionDocumentsSemanticallyEquivalent,
  mergeEffectiveProtocolViews,
  projectEffectiveProtocolView,
} from '../src/index.js';

const extensions = {
  'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] },
};
const source = {
  $schema: RC_2_SCHEMA_URI,
  mcpdesc: '0.8.0',
  info: { name: 'extension-round-trip', version: '1.0.0' },
  protocolVersions: ['2025-11-25', '2026-07-28'],
  capabilities: [{ extensions }],
};

describe('mergeEffectiveProtocolViews', () => {
  it('retains equivalent pre-standard and formal extension protocol views', () => {
    const original = structuredClone(source);
    const views = source.protocolVersions.map((protocolVersion) => {
      const result = projectEffectiveProtocolView(source, {
        specification: '0.8.0-rc.2',
        protocolVersion,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('projection failed');
      return result.value;
    });

    const merged = mergeEffectiveProtocolViews(views, {
      specification: '0.8.0-rc.2',
    });
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.value.capabilities).toEqual([{ extensions }]);

    for (const [index, protocolVersion] of source.protocolVersions.entries()) {
      const roundTrip = projectEffectiveProtocolView(merged.value, {
        specification: '0.8.0-rc.2',
        protocolVersion,
      });
      expect(roundTrip.ok).toBe(true);
      if (!roundTrip.ok) continue;
      expect(
        areMcpDescriptionDocumentsSemanticallyEquivalent(
          roundTrip.value,
          views[index],
        ),
      ).toBe(true);
    }
    expect(source).toEqual(original);
  });

  it('rejects conflicting views for the same protocol revision', () => {
    const changed = structuredClone(source);
    changed.capabilities[0].extensions['io.modelcontextprotocol/ui'] = {
      mimeTypes: ['text/plain'],
    };
    const result = mergeEffectiveProtocolViews([source, changed], {
      specification: '0.8.0-rc.2',
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'conflicting-protocol-view' }),
    );
  });
});
