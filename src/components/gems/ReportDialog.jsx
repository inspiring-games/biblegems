import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const REASONS = [
  "Inappropriate content",
  "Spam or self-promotion",
  "Harassment or abuse",
  "Theological misinformation",
  "Other"
];

export default function ReportDialog({ open, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = async () => {
    if (!reason) return;
    await onSubmit(reason + (details ? `: ${details}` : ''));
    setReason('');
    setDetails('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Report Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REASONS.map(r => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={r} id={r} />
                <Label htmlFor={r} className="text-sm">{r}</Label>
              </div>
            ))}
          </RadioGroup>
          {reason === 'Other' && (
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please describe the issue…"
              className="min-h-[60px]"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!reason || submitting}>
            {submitting ? 'Sending…' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}