import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/docs/',
  title: 'HunterToolsCLI',
  description: 'Recruiter-first browser automation for LinkedIn and LinkedIn Recruiter.',
  head: [
    ['meta', { property: 'og:title', content: 'HunterToolsCLI Documentation' }],
    ['meta', { property: 'og:description', content: 'Recruiter-first browser automation for LinkedIn and LinkedIn Recruiter.' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Adapters', link: '/adapters/' },
          { text: 'Developer', link: '/developer/contributing' },
          { text: 'Advanced', link: '/advanced/cdp' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Getting Started', link: '/guide/getting-started' },
                { text: 'Installation', link: '/guide/installation' },
                { text: 'Browser Bridge', link: '/guide/browser-bridge' },
                { text: 'Troubleshooting', link: '/guide/troubleshooting' },
              ],
            },
          ],
          '/adapters/': [
            {
              text: 'Recruiting Adapters',
              items: [
                { text: 'Overview', link: '/adapters/' },
                { text: 'LinkedIn Recruiter', link: '/adapters/browser/linkedin' },
              ],
            },
          ],
          '/developer/': [
            {
              text: 'Developer Guide',
              items: [
                { text: 'Contributing', link: '/developer/contributing' },
                { text: 'Testing', link: '/developer/testing' },
                { text: 'Architecture', link: '/developer/architecture' },
              ],
            },
          ],
          '/advanced/': [
            {
              text: 'Advanced',
              items: [
                { text: 'Chrome DevTools Protocol', link: '/advanced/cdp' },
                { text: 'Remote Chrome', link: '/advanced/remote-chrome' },
              ],
            },
          ],
        },
      },
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: '适配器', link: '/zh/adapters/' },
          { text: '开发', link: '/zh/developer/contributing' },
          { text: '进阶', link: '/zh/advanced/cdp' },
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '指南',
              items: [
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '安装', link: '/zh/guide/installation' },
                { text: 'Browser Bridge', link: '/zh/guide/browser-bridge' },
              ],
            },
          ],
          '/zh/adapters/': [
            {
              text: '招聘适配器',
              items: [
                { text: '总览', link: '/zh/adapters/' },
              ],
            },
          ],
          '/zh/developer/': [
            {
              text: '开发者指南',
              items: [
                { text: '贡献指南', link: '/zh/developer/contributing' },
              ],
            },
          ],
          '/zh/advanced/': [
            {
              text: '进阶',
              items: [
                { text: 'Chrome DevTools Protocol', link: '/zh/advanced/cdp' },
              ],
            },
          ],
        },
      },
    },
  },
  themeConfig: {
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/shuizao0430/opencli' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/huntertoolscli' },
    ],
    editLink: {
      pattern: 'https://github.com/shuizao0430/opencli/edit/codex/linkedin-recruiter-workflow/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright 2024-present',
    },
  },
})
