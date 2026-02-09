import { NgModule } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Wrapper que reexporta LucideAngularModule para evitar NG1010
 * ("Value could not be determined statically") en componentes standalone.
 */
@NgModule({
  imports: [LucideAngularModule],
  exports: [LucideAngularModule],
})
export class LucideIconsModule {}
