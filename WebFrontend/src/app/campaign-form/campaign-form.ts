import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, TemplateRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService } from '../services/service';
import { NgbDateStruct, NgbInputDatepicker, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../utils/api-error';

const MAX_EVENTS = 50;

type EventGroup = FormGroup<{
  eventType: FormControl<string>;
  timestamp: FormControl<string>;
}>;

function toIsoDate(d: NgbDateStruct): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function startOfDay(d: NgbDateStruct): Date {
  return new Date(d.year, d.month - 1, d.day, 0, 0, 0, 0);
}

function endOfDay(d: NgbDateStruct): Date {
  return new Date(d.year, d.month - 1, d.day, 23, 59, 59, 999);
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateRange(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as NgbDateStruct | null;
  const end = group.get('endDate')?.value as NgbDateStruct | null;
  return start && end && toIsoDate(end) < toIsoDate(start) ? { dateRange: true } : null;
}

@Component({
  selector: 'app-campaign-form',
  imports: [ReactiveFormsModule, NgbInputDatepicker, RouterLink],
  templateUrl: './campaign-form.html',
  styleUrl: './campaign-form.css',
})
export class CampaignForm {
  private fb = inject(FormBuilder);
  private api = inject(CampaignService);
  private router = inject(Router);
  private eventmodal = inject(NgbModal);

  saving = signal(false);
  error = signal<string | null>(null);
  readonly maxEvents = MAX_EVENTS;

  form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/^[^<>]*$/)]],
      startDate: [null as NgbDateStruct | null, Validators.required],
      endDate: [null as NgbDateStruct | null, Validators.required],
      events: this.fb.array<EventGroup>([]),
    },
    { validators: dateRange },
  );

  eventForm = this.fb.group({
    eventType: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[^<>]*$/)]],
    timestamp: [''],
  });

  get events() {
    return this.form.controls.events;
  }

  private newEvent(eventType = '', timestamp = ''): EventGroup {
    return this.fb.nonNullable.group({
      eventType: [eventType, [Validators.required, Validators.maxLength(100), Validators.pattern(/^[^<>]*$/)]],
      timestamp: [timestamp],
    });
  }

  addEvent(eventType = '', timestamp = ''): void {
    if (this.events.length < MAX_EVENTS) {
      this.events.push(this.newEvent(eventType, timestamp));
    }
  }

  removeEvent(index: number): void {
    this.events.removeAt(index);
  }

  private validateEventDateTime(rawInput: string): { error: string | null; resolvedIso: string | null } {
    const trimmed = rawInput.trim();
    const chosenDate = trimmed ? parseDateTimeLocal(trimmed) : new Date();

    if (trimmed && !chosenDate) {
      return {
        error: 'Please enter a valid date and time.',
        resolvedIso: null,
      };
    }

    const start = this.form.controls.startDate.value;
    const end = this.form.controls.endDate.value;

    if (!start || !end) {
      return { error: null, resolvedIso: chosenDate!.toISOString() };
    }

    const minTime = startOfDay(start);
    const maxTime = endOfDay(end);

    if (minTime > maxTime) {
      return {
        error: 'Campaign end date must be on or after the start date.',
        resolvedIso: null,
      };
    }

    if (chosenDate!.getTime() < minTime.getTime() || chosenDate!.getTime() > maxTime.getTime()) {
      return {
        error: trimmed
          ? `Event timestamp must be between ${minTime.toLocaleString()} and ${maxTime.toLocaleString()}.`
          : `Current time (${chosenDate!.toLocaleString()}) is outside ${minTime.toLocaleString()} to ${maxTime.toLocaleString()}. Please pick a timestamp within the campaign range.`,
        resolvedIso: null,
      };
    }

    return { error: null, resolvedIso: chosenDate!.toISOString() };
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
    const { eventType, timestamp } = this.eventForm.getRawValue();
    const { error: rangeError, resolvedIso } = this.validateEventDateTime(timestamp ?? '');

    if (rangeError) {
      this.eventForm.controls.timestamp.setErrors({ outOfRange: rangeError });
    } else if (this.eventForm.controls.timestamp.errors?.['outOfRange']) {
      this.eventForm.controls.timestamp.setErrors(null);
    }

    if (this.eventForm.invalid || !resolvedIso) {
      this.eventForm.markAllAsTouched();
      return;
    }

    if (this.events.length >= MAX_EVENTS) {
      modal.close();
      return;
    }

    this.addEvent(eventType!.trim(), resolvedIso);
    this.eventForm.reset({ eventType: '', timestamp: '' });
    modal.close('Save click');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const minTime = startOfDay(v.startDate!).getTime();
    const maxTime = endOfDay(v.endDate!).getTime();

    for (let i = 0; i < v.events.length; i++) {
      const evDate = new Date(v.events[i].timestamp);
      if (Number.isNaN(evDate.getTime()) || evDate.getTime() < minTime || evDate.getTime() > maxTime) {
        this.error.set(`Event #${i + 1} timestamp is outside the campaign start and end dates.`);
        return;
      }
    }

    this.saving.set(true);
    this.error.set(null);

    this.api
      .create({
        name: v.name.trim(),
        startDate: toIsoDate(v.startDate!),
        endDate: toIsoDate(v.endDate!),
        events: v.events.map((e) => ({
          eventType: e.eventType.trim(),
          timestamp: e.timestamp,
        })),
      })
      .subscribe({
        next: (c) => this.router.navigate(['/campaigns', c.id]),
        error: (e: HttpErrorResponse) => {
          this.error.set(apiErrorMessage(e, 'Could not save the campaign.'));
          this.saving.set(false);
        },
      });
  }
}