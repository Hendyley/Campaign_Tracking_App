import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, OnInit, TemplateRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Campaign, EventDto } from '../data_models/model';
import { CampaignService } from '../services/service';
import { apiErrorMessage } from '../utils/api-error';

function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    const date = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      ss ? Number(ss) : 0,
      0,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function startBound(raw: string | Date): Date {
  if (raw instanceof Date) {
    return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate(), 0, 0, 0, 0);
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const parsed = new Date(str);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
}

function endBound(raw: string | Date): Date {
  if (raw instanceof Date) {
    return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate(), 23, 59, 59, 999);
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  const parsed = new Date(str);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
}

function toLocalIsoNoZone(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

@Component({
  selector: 'app-campaign-detail',
  imports: [DatePipe, RouterLink, ReactiveFormsModule],
  templateUrl: './campaign-detail.html',
  styleUrl: './campaign-detail.css',
})
export class CampaignDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(CampaignService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private eventmodal = inject(NgbModal);

  campaign = signal<Campaign | null>(null);
  state = signal<'loading' | 'ok' | 'notfound' | 'error'>('loading');
  busy = signal(false);
  actionError = signal<string | null>(null);

  eventForm = this.fb.group({
    eventType: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[^<>]*$/)]],
    timestamp: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get(id).subscribe({
      next: (c) => {
        this.campaign.set(c);
        this.state.set('ok');
      },
      error: (e: HttpErrorResponse) => this.state.set(e.status === 404 ? 'notfound' : 'error'),
    });
  }

  private validateEventDateTime(rawInput: string, c: Campaign): { error: string | null; resolvedIso: string | null } {
    const trimmed = rawInput.trim();
    const chosenDate = trimmed ? parseDateTimeLocal(trimmed) : new Date();

    if (trimmed && !chosenDate) {
      return {
        error: 'Please enter a valid date and time.',
        resolvedIso: null,
      };
    }

    const minTime = startBound(c.startDate);
    const maxTime = endBound(c.endDate);

    if (minTime > maxTime) {
      return {
        error: 'Campaign end date is earlier than start date.',
        resolvedIso: null,
      };
    }

    if (chosenDate!.getTime() < minTime.getTime() || chosenDate!.getTime() > maxTime.getTime()) {
      return {
        error: trimmed
          ? `Event timestamp must be between ${minTime.toLocaleString()} and ${maxTime.toLocaleString()}.`
          : `Current time (${toLocalIsoNoZone(chosenDate!)}) is outside ${minTime.toLocaleString()} to ${maxTime.toLocaleString()}. Please pick a timestamp within the campaign range.`,
        resolvedIso: null,
      };
    }

    return { error: null, resolvedIso: toLocalIsoNoZone(chosenDate!) };
  }

  open(content: TemplateRef<unknown>): void {
    this.eventForm.reset({ eventType: '', timestamp: '' });
    this.eventmodal.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then(
      () => {},
      () => {
        this.eventForm.reset({ eventType: '', timestamp: '' });
      },
    );
  }

  saveEvent(modal: { close: (reason?: unknown) => void }): void {
    const c = this.campaign();
    if (!c) {
      return;
    }

    const { eventType, timestamp } = this.eventForm.getRawValue();
    const { error: rangeError, resolvedIso } = this.validateEventDateTime(timestamp ?? '', c);

    if (rangeError) {
      this.eventForm.controls.timestamp.setErrors({ outOfRange: rangeError });
    } else if (this.eventForm.controls.timestamp.errors?.['outOfRange']) {
      this.eventForm.controls.timestamp.setErrors(null);
    }

    if (this.eventForm.invalid || !resolvedIso) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.actionError.set(null);

    this.api
      .createEvent({
        campaignId: c.id,
        eventType: eventType!.trim(),
        timestamp: resolvedIso,
      })
      .subscribe({
        next: () => {
          this.eventForm.reset({ eventType: '', timestamp: '' });
          this.busy.set(false);
          modal.close('Save click');
          this.load();
        },
        error: (e: HttpErrorResponse) => {
          this.actionError.set(apiErrorMessage(e, 'Could not add the event.'));
          this.busy.set(false);
        },
      });
  }

  removeEvent(ev: EventDto): void {
    if (!window.confirm(`Delete the event "${ev.eventType}"?`)) {
      return;
    }
    this.actionError.set(null);
    this.api.deleteEvent(ev.id).subscribe({
      next: () => this.load(),
      error: (e: HttpErrorResponse) =>
        this.actionError.set(apiErrorMessage(e, 'Could not delete the event.')),
    });
  }

  removeCampaign(): void {
    const c = this.campaign();
    if (!c || !window.confirm(`Delete "${c.name}" and its ${c.eventCount} event(s)?`)) {
      return;
    }
    this.actionError.set(null);
    this.api.deleteCampaign(c.id).subscribe({
      next: () => this.router.navigate(['/campaigns/all']),
      error: (e: HttpErrorResponse) =>
        this.actionError.set(apiErrorMessage(e, 'Could not delete the campaign.')),
    });
  }

  formatLiteral(ts: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(ts);
    if (!m) return ts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const h24 = Number(m[4]);
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}, ${h12}:${m[5]} ${ampm}`;
  }
}