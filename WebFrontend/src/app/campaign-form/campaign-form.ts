import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, TemplateRef } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService } from '../services/service';
import { NgbDateStruct, NgbInputDatepicker, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { ActivatedRoute, RouterLink } from '@angular/router';

function toIso(d: NgbDateStruct): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function dateRange(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as NgbDateStruct | null;
  const end = group.get('endDate')?.value as NgbDateStruct | null;
  return start && end && toIso(end) <= toIso(start) ? { dateRange: true } : null;
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

  saving = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/^[^<>]*$/)]],
      startDate: [null as NgbDateStruct | null, Validators.required],
      endDate: [null as NgbDateStruct | null, Validators.required],
    },
    { validators: dateRange },
  );

  addEvent(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    this.api.create({
      name: v.name!.trim(),
      startDate: toIso(v.startDate!),
      endDate: toIso(v.endDate!),
    })
    .subscribe({
      next: (c) => this.router.navigate(['/campaigns', c.id]),
      error: (e: HttpErrorResponse) => {
        const apiErrors = e.error?.errors as Record<string, string[]> | undefined;
        this.error.set(apiErrors ? Object.values(apiErrors).flat().join(' ') : 'Could not save the campaign.');
        this.saving.set(false);
      },
    });
  }
}