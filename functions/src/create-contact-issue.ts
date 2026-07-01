import { createHash } from 'node:crypto';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const githubContactToken = defineSecret('GITHUB_CONTACT_TOKEN');
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OWNER = 'bastienmoulia';
const GITHUB_REPO = 'txapelketak';
const GITHUB_CONTACT_LABEL = 'contact';
const ALLOWED_LOCALES = new Set(['fr', 'eu', 'en', 'es']);
const GITHUB_USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const CONTACT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX_REQUESTS = 3;

if (getApps().length === 0) {
  initializeApp();
}

interface CreateContactIssueData {
  name: string;
  githubUsername?: string;
  subject: string;
  message: string;
  locale?: string;
  website?: string;
}

interface CreateContactIssueResponse {
  issueNumber: number;
  issueUrl: string;
}

function requireText(
  value: unknown,
  fieldName: string,
  options: { minLength: number; maxLength: number },
): string {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${fieldName} must be a string`);
  }

  const normalized = value.trim().replace(/\r\n/g, '\n');

  if (normalized.length < options.minLength) {
    throw new HttpsError(
      'invalid-argument',
      `${fieldName} must contain at least ${options.minLength} characters`,
    );
  }

  if (normalized.length > options.maxLength) {
    throw new HttpsError(
      'invalid-argument',
      `${fieldName} must contain at most ${options.maxLength} characters`,
    );
  }

  return normalized;
}

function normalizeGithubUsername(value: unknown): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'githubUsername must be a string');
  }

  const normalized = value.trim().replace(/^@/, '');

  if (normalized.length === 0) {
    return undefined;
  }

  if (!GITHUB_USERNAME_PATTERN.test(normalized)) {
    throw new HttpsError('invalid-argument', 'githubUsername is invalid');
  }

  return normalized;
}

function normalizeLocale(value: unknown): string {
  if (typeof value !== 'string') {
    return 'fr';
  }

  return ALLOWED_LOCALES.has(value) ? value : 'fr';
}

function buildRateLimitKey(ip: string, userAgent: string): string {
  return createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
}

async function enforceRateLimit(ip: string, userAgent: string): Promise<void> {
  const db = getFirestore();
  const key = buildRateLimitKey(ip, userAgent);
  const rateLimitRef = db.collection('contactRateLimits').doc(key);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const data = snapshot.data() as
      | {
          windowStartedAt?: number;
          requestCount?: number;
        }
      | undefined;

    const windowStartedAt = data?.windowStartedAt ?? now;
    const requestCount = data?.requestCount ?? 0;
    const sameWindow = now - windowStartedAt < CONTACT_RATE_LIMIT_WINDOW_MS;
    const nextCount = sameWindow ? requestCount + 1 : 1;

    if (sameWindow && requestCount >= CONTACT_RATE_LIMIT_MAX_REQUESTS) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many contact requests from the same client. Please try again later.',
      );
    }

    transaction.set(
      rateLimitRef,
      {
        windowStartedAt: sameWindow ? windowStartedAt : now,
        requestCount: nextCount,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

function buildIssueBody(payload: {
  name: string;
  githubUsername?: string;
  subject: string;
  message: string;
  locale: string;
  userAgent: string;
}): string {
  return [
    '## Contact request',
    '',
    `- Name: ${payload.name}`,
    `- GitHub username: ${payload.githubUsername ? `@${payload.githubUsername}` : 'N/A'}`,
    `- Locale: ${payload.locale}`,
    '- Source: public contact form',
    '',
    '## Subject',
    '',
    payload.subject,
    '',
    '## Message',
    '',
    payload.message,
    '',
    '---',
    '',
    `User-Agent: ${payload.userAgent || 'unknown'}`,
  ].join('\n');
}

export const createContactIssue = onCall<CreateContactIssueData>(
  {
    region: 'europe-west1',
    secrets: [githubContactToken],
  },
  async (request): Promise<CreateContactIssueResponse> => {
    if (typeof request.data?.website === 'string' && request.data.website.trim().length > 0) {
      throw new HttpsError('permission-denied', 'Contact submission rejected');
    }

    const name = requireText(request.data?.name, 'name', { minLength: 2, maxLength: 80 });
    const subject = requireText(request.data?.subject, 'subject', {
      minLength: 3,
      maxLength: 120,
    }).replace(/\s+/g, ' ');
    const message = requireText(request.data?.message, 'message', {
      minLength: 10,
      maxLength: 5000,
    });
    const githubUsername = normalizeGithubUsername(request.data?.githubUsername);
    const locale = normalizeLocale(request.data?.locale);
    const userAgent = request.rawRequest.get('user-agent') ?? 'unknown';
    const clientIp =
      request.rawRequest.ip ||
      request.rawRequest.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';

    await enforceRateLimit(clientIp, userAgent);

    let token: string;
    try {
      token = githubContactToken.value();
    } catch (error) {
      logger.error('GITHUB_CONTACT_TOKEN is not configured', error);
      throw new HttpsError(
        'failed-precondition',
        'GITHUB_CONTACT_TOKEN is not configured in Firebase Functions',
      );
    }

    const response = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'txapelketak-contact-function',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: `[Contact] ${subject}`,
        labels: [GITHUB_CONTACT_LABEL],
        body: buildIssueBody({
          name,
          githubUsername,
          subject,
          message,
          locale,
          userAgent,
        }),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let githubMessage: string | undefined;
      try {
        const parsed = JSON.parse(errorBody) as { message?: string };
        githubMessage = typeof parsed.message === 'string' ? parsed.message : undefined;
      } catch {
        githubMessage = undefined;
      }

      logger.error('GitHub issue creation failed', {
        status: response.status,
        body: errorBody,
      });

      if (response.status === 401 || response.status === 403) {
        throw new HttpsError(
          'failed-precondition',
          githubMessage
            ? `GitHub rejected GITHUB_CONTACT_TOKEN: ${githubMessage}`
            : 'GitHub rejected GITHUB_CONTACT_TOKEN. Check the token and its Issues permission.',
        );
      }

      if (response.status === 422) {
        throw new HttpsError(
          'invalid-argument',
          githubMessage || 'GitHub refused the contact issue payload',
        );
      }

      throw new HttpsError(
        'internal',
        githubMessage ? `GitHub error: ${githubMessage}` : 'Unable to create the contact ticket',
      );
    }

    const issue = (await response.json()) as { number?: number; html_url?: string };

    if (typeof issue.number !== 'number' || typeof issue.html_url !== 'string') {
      throw new HttpsError('internal', 'GitHub returned an invalid contact ticket response');
    }

    return {
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    };
  },
);
