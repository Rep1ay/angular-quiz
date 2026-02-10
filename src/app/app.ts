import { Component, signal } from '@angular/core';
import { CurrentWeatherSection } from './current-weather-section/current-weather-section';
import { Header } from './header/header';

@Component({
  selector: 'app-root',
  imports: [Header, CurrentWeatherSection],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('app');
}
