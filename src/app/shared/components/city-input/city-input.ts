import { ChangeDetectionStrategy, Component, OnInit, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs';

@Component({
  selector: 'app-city-input',
  imports: [ReactiveFormsModule],
  templateUrl: './city-input.html',
  styleUrl: './city-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CityInput implements OnInit {

  public readonly onCityChanged = output<string>()

  protected readonly cityInput = new FormControl<string>('');

  ngOnInit() {
    this.subscribeToCityInputChanges();
  }

  private subscribeToCityInputChanges(): void {
    this.cityInput.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap((value: string | null) => {
        this.onCityChanged.emit(value?.trim() || '');
        console.log(value);
      })).subscribe();
  }
}
