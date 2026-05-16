import { DocumentReference } from '@angular/fire/firestore';

export interface Team {
  ref: DocumentReference;
  name: string;
  comment?: string;
  serieName?: string;
  pouleName?: string;
}
