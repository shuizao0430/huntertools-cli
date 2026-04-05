import { describe, expect, it } from 'vitest';
import { getRegistry } from '../../registry.js';
import './message.js';
import './save-to-project.js';

const { resolveTargetUrl: resolveMessageTargetUrl } = await import('./message.js').then(
  (m) => (m as any).__test__,
);
const { resolveTargetUrl: resolveSaveTargetUrl } = await import('./save-to-project.js').then(
  (m) => (m as any).__test__,
);

describe('linkedin phase 2 write adapters', () => {
  it('registers linkedin message', () => {
    const command = getRegistry().get('linkedin/message');
    expect(command).toBeDefined();
    expect(command!.strategy).toBe('cookie');
    expect(command!.browser).toBe(true);
    expect(command!.args.map((arg) => arg.name)).toEqual(
      expect.arrayContaining(['candidate-id', 'text', 'profile-url']),
    );
    expect(command!.columns).toEqual(
      expect.arrayContaining(['candidate_id', 'conversation_id', 'profile_url', 'status', 'detail']),
    );
  });

  it('registers linkedin save-to-project', () => {
    const command = getRegistry().get('linkedin/save-to-project');
    expect(command).toBeDefined();
    expect(command!.strategy).toBe('cookie');
    expect(command!.browser).toBe(true);
    expect(command!.args.find((arg) => arg.name === 'project-id')?.required).toBe(true);
    expect(command!.columns).toEqual(
      expect.arrayContaining(['candidate_id', 'project_id', 'project_name', 'profile_url', 'status']),
    );
  });
});

describe('phase 2 target resolution', () => {
  it('reuses shared public profile resolution for message', () => {
    expect(
      resolveMessageTargetUrl('url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL2luL2phbmUtZG9lLw', undefined),
    ).toBe('https://www.linkedin.com/in/jane-doe/');
  });

  it('falls back to recruiter profile urls for opaque candidate ids', () => {
    expect(resolveSaveTargetUrl('ACoAAA123XYZ', undefined)).toBe(
      'https://www.linkedin.com/talent/profile/ACoAAA123XYZ?rightRail=saveToProject',
    );
  });

  it('normalizes recruiter project-context profile urls to the save rail surface for save-to-project', () => {
    expect(
      resolveSaveTargetUrl(
        'url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL3RhbGVudC9wcm9maWxlL0FFTUFBQUpsMXhVQnd1WFpheHFtc2RvZnRSaENVM21uVDM4RlI3OD9wcm9qZWN0PTM3NjEyNDk0NiZ0cms9UFJPSkVDVF9QSVBFTElORQ',
        undefined,
      ),
    ).toBe('https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78?rightRail=saveToProject');
  });
});
