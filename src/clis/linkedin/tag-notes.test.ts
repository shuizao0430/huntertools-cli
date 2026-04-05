import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './tag.js';
import './notes.js';

const { resolveTargetUrl: resolveTagTargetUrl } = await import('./tag.js').then(
  (m) => (m as any).__test__,
);
const { resolveTargetUrl: resolveNotesTargetUrl } = await import('./notes.js').then(
  (m) => (m as any).__test__,
);

describe('linkedin tag and notes adapters', () => {
  it('registers linkedin tag', () => {
    const command = getRegistry().get('linkedin/tag');
    expect(command).toBeDefined();
    expect(command!.strategy).toBe('cookie');
    expect(command!.browser).toBe(true);
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining(['candidate-id', 'tag', 'profile-url']),
    );
    expect(command!.columns).toEqual(
      expect.arrayContaining(['candidate_id', 'tag', 'profile_url', 'status', 'detail']),
    );
  });

  it('registers linkedin notes', () => {
    const command = getRegistry().get('linkedin/notes');
    expect(command).toBeDefined();
    expect(command!.strategy).toBe('cookie');
    expect(command!.browser).toBe(true);
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining(['candidate-id', 'text', 'profile-url']),
    );
    expect(command!.columns).toEqual(
      expect.arrayContaining(['candidate_id', 'note', 'profile_url', 'status', 'detail']),
    );
  });
});

describe('tag and notes target resolution', () => {
  it('reuses shared candidate resolution for tag', () => {
    expect(
      resolveTagTargetUrl('url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL2luL2phbmUtZG9lLw', undefined),
    ).toBe('https://www.linkedin.com/in/jane-doe/');
  });

  it('falls back to recruiter profile urls for notes', () => {
    expect(resolveNotesTargetUrl('ACoAAA123XYZ', undefined)).toBe(
      'https://www.linkedin.com/talent/profile/ACoAAA123XYZ',
    );
  });
});
