# Research Notes

Research date: 2026-05-25.

## External patterns reviewed

### Vercel

Vercel's homepage is centered on build, deploy, security, content delivery, and AI-era developer workflows. The useful pattern for PagePort is not visual mimicry, but the promise of a single deploy action that produces a reliable web experience.

Reference: https://vercel.com/

### Netlify Deploy Previews

Netlify frames previews as shareable URLs for work in progress, and its platform navigation explicitly includes agent-related workflows. This validates the broader market language around previews, feedback, and agent-generated work.

Reference: https://www.netlify.com/platform/core/deploy-previews/

### Cloudflare Pages

Cloudflare Pages remains a reference for frontend deployment and global delivery. PagePort should avoid competing on full frontend deployment; it should focus on single artifact publishing from agents.

Reference: https://pages.cloudflare.com/

### Tencent COS

Tencent COS supports static website hosting for static content such as HTML and client-side scripts. The docs also note custom domain requirements and newer bucket behavior that make custom domains a baseline production concern.

Reference: https://cloud.tencent.com/document/product/436/32670

### Alibaba Cloud ICP Filing

Alibaba Cloud's ICP documentation states that non-commercial internet information services provided within mainland China need filing. PagePort's mainland deployment path should treat ICP filing as a launch requirement for mainland domains/CDN.

Reference: https://help.aliyun.com/zh/icp-filing/

## Product implications

- Do not position PagePort as another Vercel, Netlify, or Cloudflare Pages.
- Lead with the agent last-mile problem: artifact exists, but the user needs a trusted URL.
- Keep the first screen functional and developer-oriented, with a product preview and concrete API call.
- Avoid AI-generic visuals. Use clean operational UI: code, status, artifact metadata, runtime isolation.
- Make the control plane and artifact runtime separation visible in docs because it is the real trust boundary.
