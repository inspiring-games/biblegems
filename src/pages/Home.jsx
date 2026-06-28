  const handleReportSubmit = async (reason) => {
    if (!user || !reportTarget) return;
    setReportSubmitting(true);
    try {
      const { error } = await tables.reports().insert({
        target_id: reportTarget.id,
        target_type: 'gem',
        reporter_id: user.id,
        reason,
        status: 'pending',
        created_date: new Date().toISOString()
      });
      if (error) throw error;
      toast({ title: 'Report submitted' });
      setReportTarget(null);
    } catch (error) {
      console.error('Could not submit report', error);
      toast({ title: 'Unable to report', description: error.message || 'Please try again.' });
    } finally {
      setReportSubmitting(false);
    }
  };
