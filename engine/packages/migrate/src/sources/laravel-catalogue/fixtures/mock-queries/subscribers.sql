-- Newsletter subscribers with their recorded consent; a row without consent
-- gets one re-permission email and nothing else (MIGRATION.md §5).
SELECT JSON_OBJECT(
  'email', s.email,
  'name', s.name,
  'hasConsent', s.consent_at IS NOT NULL,
  'consentAt', CAST(s.consent_at AS CHAR),
  'consentSource', s.consent_source,
  'unsubscribedAt', CAST(s.unsubscribed_at AS CHAR),
  'createdAt', CAST(s.created_at AS CHAR)
)
FROM newsletter_subscribers s
ORDER BY s.id;
