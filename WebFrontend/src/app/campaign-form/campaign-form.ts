import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, TemplateRef } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService } from '../services/service';
import { NgbInputDatepicker, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';

// yyyy-MM-dd strings compare correctly as text
function dateRange(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  return start && end && end <= start ? { dateRange: true } : null;
}

@Component({
  selector: 'app-campaign-form',
  imports: [ReactiveFormsModule, NgbInputDatepicker],
  templateUrl: './campaign-form.html',
  styleUrl: './campaign-form.css',
})
export class CampaignForm {
  private fb = inject(FormBuilder);
  private api = inject(CampaignService);
  private router = inject(Router);
  
  private modalService = inject(NgbModal);
  readonly closeResult = signal('');

  open(content: TemplateRef<any>){
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then(
      (result) => {
        this.closeResult.set(`Closed with: ${result}`);
      },
      (reason) => {
        this.closeResult.set(`Dismissed ${this.getDismissReason(reason)}`);
      }
    )
  }

  private getDismissReason(reason: any): string {
      switch (reason) {
        case ModalDismissReasons.ESC:
          return 'by pressing ESC';
        case ModalDismissReasons.BACKDROP_CLICK:
          return 'by clicking on a backdrop';
        default:
          return `with: ${reason}`;
      }
    }


  saving = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/^[^<>]*$/)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    },
    { validators: dateRange },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    this.api.create(this.form.getRawValue()).subscribe({
      next: (c) => this.router.navigate(['/campaigns', c.id]),
      error: (e: HttpErrorResponse) => {
        const apiErrors = e.error?.errors as Record<string, string[]> | undefined;
        this.error.set(apiErrors ? Object.values(apiErrors).flat().join(' ') : 'Could not save the campaign.');
        this.saving.set(false);
      },
    });
  }
}