import { describe, expect, it } from 'vitest';
import './recruiter-utils.js';

const {
  normalizeWhitespace,
  parseCsvArg,
  toYesNo,
  looksLikeRecruiterNoteReplySurface,
  looksLikeRecruiterReplyComposer,
  queriesLookCompatible,
  namesLookCompatible,
  candidateIdFromProfileUrl,
  decodeCandidateId,
  normalizeRecruiterInboxReplyResult,
  resolveRecruiterProfileUrl,
  isLinkedinProfileUrl,
  buildRecruiterProjectUrl,
  buildRecruiterProjectMembersUrl,
  extractRecruiterProjectId,
  extractRecruiterProfileToken,
  buildRecruiterInboxUrl,
  buildRecruiterInboxThreadUrl,
  buildRecruiterProfileMessagesUrl,
  buildRecruiterSearchUrl,
  formatNetworkDistance,
  firstCurrentWorkExperience,
  mergeCandidates,
  mergeInboxThreads,
  extractRecruiterPeopleFromSearchHitsPayload,
  summarizeRecruiterPeopleStats,
  summarizeRecruiterInboxStats,
  buildRecruiterFollowUpQueue,
  renderRecruiterFollowUpTemplate,
  presetRecruiterFollowUpExportFields,
  normalizeRecruiterFollowUpFieldMappings,
  exportRecruiterFollowUpQueue,
  applyVisibleFilters,
  listToMultiline,
  describeRecruiterProjectChooserBlocker,
} = await import('./recruiter-utils.js').then((m) => (m as any).__test__);

describe('linkedin recruiter utils', () => {
  it('normalizes whitespace and csv args', () => {
    expect(normalizeWhitespace('  Senior   Recruiter \n APAC ')).toBe('Senior Recruiter APAC');
    expect(parseCsvArg('english, mandarin ,  sourcing')).toEqual([
      'english',
      'mandarin',
      'sourcing',
    ]);
  });

  it('normalizes open-to-work values', () => {
    expect(toYesNo(true)).toBe('yes');
    expect(toYesNo('Open')).toBe('yes');
    expect(toYesNo('0')).toBe('no');
  });

  it('distinguishes recruiter inbox composers from note reply surfaces', () => {
    expect(looksLikeRecruiterReplyComposer('compose-textarea__textarea 写新消息')).toBe(true);
    expect(looksLikeRecruiterReplyComposer('textarea placeholder=回复…')).toBe(true);
    expect(looksLikeRecruiterNoteReplySurface('create-edit-note__form 输入备注文本')).toBe(true);
    expect(looksLikeRecruiterNoteReplySurface('note__reply 备注')).toBe(true);
    expect(looksLikeRecruiterNoteReplySurface('compose-textarea__textarea 写新消息')).toBe(false);
  });

  it('detects compatible recruiter queries without requiring an exact string match', () => {
    expect(queriesLookCompatible('technical recruiter', 'technical recruiter singapore')).toBe(true);
    expect(queriesLookCompatible('technical recruiter', 'senior technical recruiter')).toBe(true);
    expect(queriesLookCompatible('technical recruiter', 'talent acquisition')).toBe(false);
  });

  it('only treats genuinely matching candidate names as compatible', () => {
    expect(namesLookCompatible('James Harrison', 'Jame Harri on')).toBe(true);
    expect(namesLookCompatible('Andrea Cheng Zi Ting', 'Andrea Cheng Zi Ting')).toBe(true);
    expect(namesLookCompatible('Soojin Cheon', 'Amanda Yeo')).toBe(false);
  });

  it('encodes and decodes candidate ids from profile urls', () => {
    const id = candidateIdFromProfileUrl('https://www.linkedin.com/in/jane-doe/?trk=public_profile');
    expect(id.startsWith('url:')).toBe(true);
    expect(decodeCandidateId(id)).toBe('https://www.linkedin.com/in/jane-doe/');
  });

  it('normalizes inbox reply results by canonicalizing profile urls and backfilling candidate ids', () => {
    expect(normalizeRecruiterInboxReplyResult({
      conversation_id: 'conv-1',
      candidate_id: '',
      profile_url: 'https://www.linkedin.com/talent/profile/AEMA123?project=42&trk=null',
      status: 'sent',
      detail: 'Sent recruiter reply: BEST WISHES！',
      list_source: 'batch-reply',
    })).toEqual({
      conversation_id: 'conv-1',
      candidate_id: 'url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL3RhbGVudC9wcm9maWxlL0FFTUExMjM_cHJvamVjdD00Mg',
      profile_url: 'https://www.linkedin.com/talent/profile/AEMA123?project=42',
      status: 'sent',
      detail: 'Sent recruiter reply: BEST WISHES！',
      list_source: 'batch-reply',
    });
  });

  it('resolves recruiter profile urls from candidate references', () => {
    expect(resolveRecruiterProfileUrl('url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL2luL2phbmUtZG9lLw', undefined)).toBe(
      'https://www.linkedin.com/in/jane-doe/',
    );
    expect(resolveRecruiterProfileUrl('ACoAAA123XYZ', undefined)).toBe(
      'https://www.linkedin.com/talent/profile/ACoAAA123XYZ',
    );
  });

  it('recognizes linkedin profile routes and rejects non-profile recruiter pages', () => {
    expect(isLinkedinProfileUrl('https://www.linkedin.com/in/jane-doe/')).toBe(true);
    expect(isLinkedinProfileUrl('https://www.linkedin.com/talent/profile/ACoAAA123XYZ')).toBe(true);
    expect(
      isLinkedinProfileUrl(
        'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78/requisition?project=376124946',
      ),
    ).toBe(true);
    expect(isLinkedinProfileUrl('https://www.linkedin.com/talent/hire/376124946/manage/all')).toBe(false);
    expect(isLinkedinProfileUrl('https://www.linkedin.com/uas/login-cap?session_redirect=foo')).toBe(false);
  });

  it('builds recruiter project urls', () => {
    expect(buildRecruiterProjectUrl('project 123')).toBe(
      'https://www.linkedin.com/talent/hire/project%20123/overview',
    );
    expect(buildRecruiterProjectMembersUrl('project 123')).toBe(
      'https://www.linkedin.com/talent/hire/project%20123/manage/all',
    );
  });

  it('extracts recruiter project and profile tokens from profile urls', () => {
    const url = 'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78?project=376124946&trk=PROJECT_PIPELINE';
    expect(extractRecruiterProjectId(url)).toBe('376124946');
    expect(extractRecruiterProfileToken(url)).toBe('AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78');
  });

  it('builds recruiter inbox urls', () => {
    expect(buildRecruiterInboxUrl()).toBe('https://www.linkedin.com/talent/inbox/0/main');
  });

  it('builds recruiter inbox thread urls', () => {
    expect(buildRecruiterInboxThreadUrl('conv 123')).toBe(
      'https://www.linkedin.com/talent/inbox/0/main/id/conv%20123',
    );
  });

  it('builds recruiter profile message urls', () => {
    expect(buildRecruiterProfileMessagesUrl(
      undefined,
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78?project=376124946&trk=PROJECT_PIPELINE',
    )).toBe(
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78/messages?project=376124946&trk=PROJECT_PIPELINE',
    );
    expect(buildRecruiterProfileMessagesUrl(
      'url:aHR0cHM6Ly93d3cubGlua2VkaW4uY29tL3RhbGVudC9wcm9maWxlL0FFTUFBQUpsMXhVQnd1WFpheHFtc2RvZnRSaENVM21uVDM4RlI3OD9wcm9qZWN0PTM3NjEyNDk0NiZ0cms9UFJPSkVDVF9QSVBFTElORQ',
      undefined,
    )).toBe(
      'https://www.linkedin.com/talent/profile/AEMAAAJl1xUBwuXZaxqmsdoftRhCU3mnT38FR78/messages?project=376124946',
    );
  });

  it('builds recruiter search urls with recruiter filters', () => {
    const url = buildRecruiterSearchUrl({
      query: 'site reliability engineer',
      location: 'Singapore',
      currentTitle: 'Staff Engineer',
      pastCompany: 'Google',
      industry: 'Internet',
      seniority: 'staff',
      skills: 'kubernetes,go',
      language: 'english',
      openToWork: true,
      limit: 10,
      start: 20,
    });

    expect(url).toContain('https://www.linkedin.com/talent/search?');
    expect(url).toContain('keywords=site+reliability+engineer');
    expect(url).toContain('location=Singapore');
    expect(url).toContain('currentTitle=Staff+Engineer');
    expect(url).toContain('pastCompany=Google');
    expect(url).toContain('openToWork=true');
    expect(url).toContain('start=20');
  });

  it('normalizes recruiter network distance and work experience helpers', () => {
    expect(formatNetworkDistance('SECOND_DEGREE')).toBe('2nd');
    expect(formatNetworkDistance('FIRST_DEGREE')).toBe('1st');
    expect(formatNetworkDistance('2 度人脉 · 2 度')).toBe('2nd');
    expect(firstCurrentWorkExperience({
      workExperience: [
        { companyName: 'Data Concepts', title: 'Technical Recruiter' },
      ],
    })).toEqual({
      company: 'Data Concepts',
      title: 'Technical Recruiter',
    });
  });

  it('deduplicates candidates by candidate_id', () => {
    const base = {
      candidate_id: 'url:abc',
      profile_url: 'https://www.linkedin.com/in/a/',
      name: 'A',
      headline: 'Staff Recruiter at Example',
      location: 'London',
      current_company: 'Example',
      current_title: 'Staff Recruiter',
      connection_degree: '2nd',
      open_to_work: 'no',
      match_signals: 'shared connection',
      list_source: 'search',
    };

    const merged = mergeCandidates([base], [base, { ...base, candidate_id: 'url:def', name: 'B' }]);
    expect(merged).toHaveLength(2);
    expect(merged[1].name).toBe('B');
  });

  it('extracts recruiter candidates from searchHits payloads', () => {
    const candidates = extractRecruiterPeopleFromSearchHitsPayload({
      data: {
        elements: [
          {
            entityUrn: 'urn:li:ts_profile:AEMA123',
            firstName: 'Jane',
            lastName: 'Doe',
            headline: 'Recruiting @ Airwallex',
            locationName: 'Singapore',
            defaultPosition: {
              title: 'Manager, Talent Acquisition',
              companyName: 'Airwallex',
            },
            publicProfileUrl: 'https://www.linkedin.com/in/jane-doe/?trk=foo',
            memberPreferences: {
              openToNewOpportunities: true,
              titles: ['Manager, Talent Acquisition'],
            },
            highlights: {
              connections: {
                totalCount: 8,
              },
            },
            canSendInMail: true,
          },
        ],
      },
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidate_id: 'AEMA123',
      name: 'Jane Doe',
      headline: 'Recruiting @ Airwallex',
      location: 'Singapore',
      current_company: 'Airwallex',
      current_title: 'Manager, Talent Acquisition',
      open_to_work: 'yes',
    });
    expect(candidates[0].profile_url).toBe('https://www.linkedin.com/in/jane-doe/');
    expect(candidates[0].match_signals).toContain('open to work');
    expect(candidates[0].match_signals).toContain('8 mutual connections');
    expect(candidates[0].match_signals).toContain('can send inmail');
  });

  it('merges richer candidate fields and cleans noisy match signals', () => {
    const merged = mergeCandidates([
      {
        candidate_id: 'candidate-1',
        profile_url: 'https://www.linkedin.com/talent/profile/candidate-1',
        name: 'Jane Doe',
        headline: '',
        location: '',
        current_company: '',
        current_title: '',
        connection_degree: '',
        open_to_work: 'no',
        match_signals: '发消息给Jane; 2 mutual connections',
        list_source: 'search',
      },
    ], [
      {
        candidate_id: 'candidate-1',
        profile_url: 'https://www.linkedin.com/talent/profile/candidate-1',
        name: 'Jane Doe',
        headline: 'Recruiting @ Airwallex',
        location: 'Singapore',
        current_company: 'Airwallex',
        current_title: 'Manager, Talent Acquisition',
        connection_degree: '2 度人脉',
        open_to_work: 'yes',
        match_signals: '发消息给Jane; 进入就业市场; 2 位好友; 极有可能有意向',
        list_source: 'search',
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].headline).toBe('Recruiting @ Airwallex');
    expect(merged[0].location).toBe('Singapore');
    expect(merged[0].current_company).toBe('Airwallex');
    expect(merged[0].current_title).toBe('Manager, Talent Acquisition');
    expect(merged[0].connection_degree).toBe('2nd');
    expect(merged[0].match_signals).toBe('2 mutual connections; open to work; likely interested');
  });

  it('deduplicates inbox threads by conversation_id then candidate_id', () => {
    const base = {
      conversation_id: 'conv-1',
      candidate_id: 'url:abc',
      profile_url: 'https://www.linkedin.com/in/a/',
      name: 'A',
      headline: 'Recruiter',
      last_message: 'Hello',
      last_time: 'Today',
      unread: '1',
      list_source: 'inbox',
    };

    const merged = mergeInboxThreads(
      [base],
      [base, { ...base, conversation_id: 'conv-2', candidate_id: 'url:def', name: 'B' }],
    );
    expect(merged).toHaveLength(2);
    expect(merged[1].name).toBe('B');
  });

  it('summarizes recruiter people and inbox stats', () => {
    const peopleRows = summarizeRecruiterPeopleStats([
      {
        candidate_id: 'url:one',
        profile_url: 'https://www.linkedin.com/in/one/',
        name: 'Jane Recruiter',
        headline: 'Senior Technical Recruiter at Globex',
        location: 'Singapore',
        current_company: 'Globex',
        current_title: 'Senior Technical Recruiter',
        connection_degree: '2nd',
        open_to_work: 'yes',
        match_signals: 'open to work; recent',
        list_source: 'search',
      },
    ]);
    const inboxRows = summarizeRecruiterInboxStats([
      {
        conversation_id: 'conv-1',
        candidate_id: 'url:one',
        profile_url: 'https://www.linkedin.com/in/one/',
        name: 'Jane Recruiter',
        headline: 'Senior Technical Recruiter',
        last_message: 'Thanks, interested',
        last_time: 'Today',
        unread: '1',
        list_source: 'inbox',
      },
    ]);

    expect(peopleRows.find((row: any) => row.metric === 'visible_candidates')?.value).toBe('1');
    expect(inboxRows.find((row: any) => row.metric === 'unread_threads')?.value).toBe('1');
  });

  it('builds a prioritized follow-up queue from inbox threads', () => {
    const queue = buildRecruiterFollowUpQueue([
      {
        conversation_id: 'conv-1',
        candidate_id: 'candidate-1',
        profile_url: 'https://www.linkedin.com/in/a/',
        name: 'Jane',
        headline: 'Recruiter',
        last_message: 'Thanks, I am interested',
        last_time: 'Today',
        unread: '1',
        list_source: 'inbox',
      },
      {
        conversation_id: 'conv-2',
        candidate_id: '',
        profile_url: '',
        name: 'John',
        headline: 'Sourcer',
        last_message: 'Following up later',
        last_time: '1w ago',
        unread: '',
        list_source: 'inbox',
      },
    ]);

    expect(queue[0].conversation_id).toBe('conv-1');
    expect(queue[0].recommended_action).toBe('reply-now');
    expect(queue[0].priority_score).toBeGreaterThan(queue[1].priority_score);
  });

  it('renders follow-up reply templates with queue context', () => {
    expect(renderRecruiterFollowUpTemplate(
      'Hi {{first_name}}, following up on your {{priority}} priority thread.',
      {
        rank: 1,
        priority: 'high',
        priority_score: 8,
        recommended_action: 'reply-now',
        reason: 'thread marked unread',
        conversation_id: 'conv-1',
        candidate_id: 'candidate-1',
        name: 'Jane Doe',
        headline: 'Recruiter',
        last_message: 'Interested',
        last_time: 'Today',
        unread: '1',
        profile_url: 'https://www.linkedin.com/in/a/',
        list_source: 'follow-up-queue',
      },
    )).toBe('Hi Jane, following up on your high priority thread.');
  });

  it('builds export presets and mapped follow-up rows', () => {
    expect(presetRecruiterFollowUpExportFields('sheet')).toEqual(
      expect.arrayContaining(['candidate_id=candidate_id', 'recommended_action=recommended_action']),
    );
    expect(normalizeRecruiterFollowUpFieldMappings(['Candidate ID=candidate_id', 'Priority=priority'])).toEqual([
      { target: 'Candidate ID', source: 'candidate_id' },
      { target: 'Priority', source: 'priority' },
    ]);

    const rows = exportRecruiterFollowUpQueue([
      {
        rank: 1,
        priority: 'high',
        priority_score: 8,
        recommended_action: 'reply-now',
        reason: 'thread marked unread',
        conversation_id: 'conv-1',
        candidate_id: 'candidate-1',
        name: 'Jane Doe',
        headline: 'Recruiter',
        last_message: 'Interested',
        last_time: 'Today',
        unread: '1',
        profile_url: 'https://www.linkedin.com/in/a/',
        list_source: 'follow-up-queue',
      },
    ], {
      fields: ['Candidate ID=candidate_id', 'Name=name'],
      template: 'Hi {{first_name}}',
    });

    expect(rows).toEqual([
      {
        'Candidate ID': 'candidate-1',
        Name: 'Jane Doe',
        next_message: 'Hi Jane',
      },
    ]);
  });

  it('applies visible filters against recruiter summaries', () => {
    const candidates = [
      {
        candidate_id: 'url:one',
        profile_url: 'https://www.linkedin.com/in/one/',
        name: 'Jane Recruiter',
        headline: 'Senior Technical Recruiter at Globex',
        location: 'Singapore',
        current_company: 'Globex',
        current_title: 'Senior Technical Recruiter',
        connection_degree: '2nd',
        open_to_work: 'yes',
        match_signals: 'open to work; english; sourcing',
        list_source: 'search',
      },
      {
        candidate_id: 'url:two',
        profile_url: 'https://www.linkedin.com/in/two/',
        name: 'John Sourcer',
        headline: 'Talent Sourcer at Initech',
        location: 'Berlin',
        current_company: 'Initech',
        current_title: 'Talent Sourcer',
        connection_degree: '3rd',
        open_to_work: 'no',
        match_signals: 'german; sourcing',
        list_source: 'search',
      },
    ];

    const filtered = applyVisibleFilters(candidates, {
      query: 'technical recruiter',
      location: 'singapore',
      skills: 'sourcing',
      language: 'english',
      openToWork: true,
      limit: 10,
      start: 0,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].candidate_id).toBe('url:one');
  });

  it('formats multiline list output', () => {
    expect(listToMultiline([' Java ', '', 'Python'])).toBe('Java\nPython');
  });

  it('describes an empty more-actions dropdown as a live product blocker', () => {
    expect(describeRecruiterProjectChooserBlocker({
      stageButtons: ['保存到备选人才 选择要保存至的备选人才阶段'],
      visibleButtons: ['发消息给Yiming', 'Yiming Chen的更多操作'],
      moreActions: {
        opened: true,
        ariaHidden: 'false',
        childCount: 0,
        text: '',
        visibility: 'visible',
        opacity: '1',
        zIndex: '999',
      },
    })).toContain('Recruiter more-actions opened, but LinkedIn did not populate a visible cross-project menu on this profile.');
  });

  it('falls back to a stage-save-only error when no chooser surface is populated', () => {
    expect(describeRecruiterProjectChooserBlocker({
      stageButtons: ['保存到备选人才 选择要保存至的备选人才阶段'],
      visibleButtons: ['发消息给Yiming', 'Yiming Chen的更多操作'],
      moreActions: null,
    })).toBe(
      'Only stage-save actions were visible on the current Recruiter profile, not a cross-project chooser. Visible save actions: 保存到备选人才 选择要保存至的备选人才阶段',
    );
  });
});
