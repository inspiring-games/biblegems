export async function insertReport(reportsTable, payload) {
  const reportPayload = {
    ...payload,
    status: payload.status ?? 'pending',
    created_date: payload.created_date ?? new Date().toISOString(),
  };

  const firstAttempt = await reportsTable.insert(reportPayload);
  if (!firstAttempt?.error) {
    return firstAttempt;
  }

  const message = firstAttempt.error?.message || '';
  const needsReporterFallback = message.includes("reporter_id") && Object.prototype.hasOwnProperty.call(reportPayload, 'reporter_id');

  if (!needsReporterFallback) {
    throw firstAttempt.error;
  }

  const fallbackPayload = { ...reportPayload };
  delete fallbackPayload.reporter_id;

  const secondAttempt = await reportsTable.insert(fallbackPayload);
  if (secondAttempt?.error) {
    throw secondAttempt.error;
  }

  return secondAttempt;
}
