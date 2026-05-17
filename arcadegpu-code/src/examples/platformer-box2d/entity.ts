import { DNAComponent } from '@lib/dna/dna_component';
// ---------------------------------------------------------------------------------------

export class EntityComponent extends DNAComponent {
  x: number;
  y: number;

  constructor() {
    super('Entity');
    this.x = 0;
    this.y = 0;
  }
}