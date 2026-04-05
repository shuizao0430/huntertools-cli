import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './profile.js';

const { resolveProfileUrl, chooseBestProfileTab } = await import('./profile.js').then((m) => (m as any).__test__);

describe('linkedin profile adapter', () => {
  const command = getRegistry().get('linkedin/profile');

  it('registers the command', () => {
    expect(command).toBeDefined();
    expect(command!.site).toBe('linkedin');
    expect(command!.name).toBe('profile');
    expect(command!.strategy).toBe('cookie');
    expect(command!.browser).toBe(true);
  });

  it('includes structured profile columns', () => {
    expect(command!.columns).toEqual(
      expect.arrayContaining([
        'candidate_id',
        'contact_visibility',
        'about',
        'skills',
        'languages',
        'education',
        'work_history',
      ]),
    );
  });
});

describe('resolveProfileUrl', () => {
  it('prefers explicit profile url', () => {
    expect(
      resolveProfileUrl(
        'irrelevant',
        'https://www.linkedin.com/in/example-recruiter/',
      ),
    ).toBe('https://www.linkedin.com/in/example-recruiter/');
  });

  it('decodes candidate ids produced by people-search', () => {
    expect(
      resolveProfileUrl(
        'url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL2luL2phbmUtZG9lLw',
        undefined,
      ),
    ).toBe('https://www.linkedin.com/in/jane-doe/');
  });

  it('falls back to recruiter profile routes for opaque recruiter ids', () => {
    expect(resolveProfileUrl('ACoAAA123XYZ', undefined)).toBe(
      'https://www.linkedin.com/talent/profile/ACoAAA123XYZ',
    );
  });

  it('prefers an active tab that exactly matches the target profile url', () => {
    const profileUrl = 'https://www.linkedin.com/talent/profile/ACoAAA123XYZ?project=1';
    expect(chooseBestProfileTab([
      { tabId: 1, url: 'https://www.linkedin.com/talent/profile/other', active: true },
      { tabId: 2, url: profileUrl, active: true },
      { tabId: 3, url: profileUrl, active: false },
    ], profileUrl)).toEqual({ tabId: 2, url: profileUrl, active: true });
  });
});
